"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { sanitizeStrictText } from "@/lib/sanitize";
import { auditLog, outings, participants, tickets } from "@drizzle/sortie-schema";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { deleteBlobIfOurs } from "@/features/sortie/lib/blob-cleanup";
import {
  sendOutingTicketEmails,
  sendParticipantTicketEmail,
} from "@/features/sortie/lib/emails/send-ticket-emails";
import { formDataToObject } from "@/features/sortie/lib/form-data";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { hashIp, TICKET_AUDIT_ACTION } from "@/features/sortie/lib/audit";
import { TICKET_PATH_PREFIX, uploadTicket } from "@/features/sortie/lib/ticket-upload";
import type { FormActionState } from "./outing-actions";
import { shortIdSchema } from "./schemas";

const createTicketSchema = z.discriminatedUnion("scope", [
  z.object({
    shortId: shortIdSchema,
    scope: z.literal("participant"),
    participantId: z.string().uuid(),
  }),
  z.object({
    shortId: shortIdSchema,
    scope: z.literal("outing"),
  }),
]);

const revokeTicketSchema = z.object({
  shortId: shortIdSchema,
  ticketId: z.string().uuid(),
});

async function getOrganizerSession(outingShortId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { error: "Connecte-toi pour gérer les billets." as const };
  }
  // Sans email vérifié, l'audit log et l'accès participant deviennent
  // ambigus — on refuse même l'organisateur tant qu'il n'a pas confirmé.
  if (!session.user.emailVerified) {
    return { error: "Vérifie d'abord ton email avant de gérer des billets." as const };
  }
  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, outingShortId),
  });
  if (!outing) {
    return { error: "Sortie introuvable." as const };
  }
  if (!outing.creatorUserId) {
    return { error: "Cette sortie n'a pas d'organisateur identifié." as const };
  }
  if (outing.creatorUserId !== session.user.id) {
    return { error: "Seul l'organisateur peut gérer les billets." as const };
  }
  if (outing.status === "cancelled" || outing.cancelledAt) {
    return { error: "Cette sortie est annulée." as const };
  }
  return { session, outing } as const;
}

export async function createTicketAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = createTicketSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { message: "Sélectionne un fichier." };
  }

  const authResult = await getOrganizerSession(data.shortId);
  if ("error" in authResult) {
    return { message: authResult.error };
  }
  const { session, outing } = authResult;

  const gate = await rateLimit({
    key: `ticket-upload:${session.user.id}`,
    limit: 30,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  // Refuser un participant sans compte ni email — son billet serait orphelin
  // (aucun chemin de réclamation côté destinataire).
  let targetParticipantId: string | null = null;
  if (data.scope === "participant") {
    const target = await db.query.participants.findFirst({
      where: and(eq(participants.id, data.participantId), eq(participants.outingId, outing.id)),
    });
    if (!target) {
      return { message: "Participant introuvable sur cette sortie." };
    }
    if (!target.userId && !target.anonEmail) {
      return {
        message:
          "Ce participant n'a ni compte ni email — impossible de lui envoyer un billet. Demande-lui d'ajouter un email à sa réponse.",
      };
    }
    targetParticipantId = target.id;
  }

  const upload = await uploadTicket(file);
  if (!upload.ok) {
    return { message: upload.message };
  }

  const originalFilename = file.name ? sanitizeStrictText(file.name, 255) || null : null;

  try {
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(tickets)
        .values({
          outingId: outing.id,
          scope: data.scope,
          participantId: targetParticipantId,
          blobUrl: upload.blobUrl,
          originalFilename,
          mimeType: upload.mimeType,
          sizeBytes: upload.sizeBytes,
          checksum: upload.checksum,
          encryptionKeyId: upload.envelope.keyId,
          iv: upload.envelope.iv,
          authTag: upload.envelope.authTag,
          uploadedByUserId: session.user.id,
        })
        .returning({ id: tickets.id });

      await tx.insert(auditLog).values({
        outingId: outing.id,
        actorUserId: session.user.id,
        action: TICKET_AUDIT_ACTION.TICKET_UPLOADED,
        ipHash: await hashIp(),
        payload: JSON.stringify({
          ticketId: inserted?.id,
          scope: data.scope,
          participantId: targetParticipantId,
          mimeType: upload.mimeType,
          sizeBytes: upload.sizeBytes,
        }),
      });
    });
  } catch (err) {
    console.error("[ticket-actions] insert failed, cleaning up blob", err);
    await deleteBlobIfOurs(upload.blobUrl, TICKET_PATH_PREFIX, "ticket-actions");
    return { message: "Erreur lors de l'enregistrement du billet. Réessaie." };
  }

  // Hors transaction : un échec d'envoi ne doit pas rollback un billet déjà
  // persisté. safeSend log + return en interne.
  const emailOuting = {
    title: outing.title,
    fixedDatetime: outing.fixedDatetime,
    slug: outing.slug,
    shortId: outing.shortId,
  };
  if (data.scope === "participant" && targetParticipantId) {
    await sendParticipantTicketEmail({
      outing: emailOuting,
      participantId: targetParticipantId,
    });
  } else if (data.scope === "outing") {
    await sendOutingTicketEmails({ outing: emailOuting, outingId: outing.id });
  }

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}`);
  revalidatePath(`/${canonical}/billets`);
  return {};
}

export async function revokeTicketAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = revokeTicketSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const authResult = await getOrganizerSession(data.shortId);
  if ("error" in authResult) {
    return { message: authResult.error };
  }
  const { session, outing } = authResult;

  // Le filtre outingId empêche une révocation cross-outing même si un
  // ticketId externe est passé.
  const ticket = await db.query.tickets.findFirst({
    where: and(eq(tickets.id, data.ticketId), eq(tickets.outingId, outing.id)),
  });
  if (!ticket) {
    return { message: "Billet introuvable." };
  }
  if (ticket.revokedAt) {
    return {};
  }

  await db.transaction(async (tx) => {
    await tx
      .update(tickets)
      .set({
        revokedAt: new Date(),
        revokedByUserId: session.user.id,
      })
      .where(eq(tickets.id, ticket.id));

    await tx.insert(auditLog).values({
      outingId: outing.id,
      actorUserId: session.user.id,
      action: TICKET_AUDIT_ACTION.TICKET_REVOKED,
      ipHash: await hashIp(),
      payload: JSON.stringify({
        ticketId: ticket.id,
        scope: ticket.scope,
        participantId: ticket.participantId,
      }),
    });
  });

  // Le blob reste tant que la row existe : revokedAt suffit à bloquer
  // l'accès, et garder le binaire permet un éventuel rollback côté admin.

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}`);
  revalidatePath(`/${canonical}/billets`);
  return {};
}
