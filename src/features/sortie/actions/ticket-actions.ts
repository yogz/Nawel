"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
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
import { getClientIp, rateLimit } from "@/features/sortie/lib/rate-limit";
import { TICKET_PATH_PREFIX, uploadTicket } from "@/features/sortie/lib/ticket-upload";
import type { FormActionState } from "./outing-actions";
import { shortIdSchema } from "./schemas";

// Source unique pour les valeurs auditLog.action écrites par ticket-actions.
// `varchar(64)` libre côté Drizzle — un objet const évite les typos
// silencieuses qui briseraient la requêtabilité par `action`.
const AUDIT_ACTION = {
  TICKET_UPLOADED: "TICKET_UPLOADED",
  TICKET_REVOKED: "TICKET_REVOKED",
} as const;

// Création : `participant` exige un participantId, `outing` l'interdit. Zod
// discriminé reflète l'invariant DB (CHECK constraint en migration manuelle)
// au niveau de l'action, retour utilisateur clair en cas de mauvais combo.
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

async function hashIp(): Promise<string | null> {
  const ip = await getClientIp();
  if (!ip || ip === "unknown") {
    return null;
  }
  const pepper = process.env.BETTER_AUTH_SECRET ?? "";
  return createHash("sha256")
    .update(ip + pepper)
    .digest("hex");
}

async function getOrganizerSession(outingShortId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { error: "Connecte-toi pour gérer les billets." as const };
  }
  // Stocker des billets implique une identité durable et vérifiée — sans
  // ça l'audit log et l'accès participant deviennent ambigus. On refuse
  // l'organisateur dont l'email n'a jamais été confirmé.
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

  const auth = await getOrganizerSession(data.shortId);
  if ("error" in auth) {
    return { message: auth.error };
  }
  const { session, outing } = auth;

  // Rate limit per-organizer pour éviter qu'un compte compromis spamme
  // d'uploads (chaque ticket = 5 MB max sur Vercel Blob, quota partagé).
  const gate = await rateLimit({
    key: `ticket-upload:${session.user.id}`,
    limit: 30,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  // Pour scope='participant', valider que le participant existe ET qu'il
  // peut potentiellement réclamer son billet (compte ou anonEmail). Sans
  // ça, l'organisateur uploaderait pour rien — le destinataire n'aurait
  // aucun moyen de se rattacher à la row.
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
        action: AUDIT_ACTION.TICKET_UPLOADED,
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
    // Si l'INSERT échoue, le ciphertext orphelin sur Blob est inutile
    // mais consomme le quota — on tente un cleanup best-effort.
    await deleteBlobIfOurs(upload.blobUrl, TICKET_PATH_PREFIX, "ticket-actions");
    return { message: "Erreur lors de l'enregistrement du billet. Réessaie." };
  }

  // Email best-effort, hors transaction : un échec d'envoi ne doit pas
  // rollback un billet déjà persisté. Les modules safeSend logguent + return.
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

  // Conditionner l'UPDATE sur outingId protège contre une révocation
  // cross-outing : si un id de ticket d'une autre sortie est passé, le
  // WHERE ne matche rien et l'audit log ne s'exécute pas.
  const ticket = await db.query.tickets.findFirst({
    where: and(eq(tickets.id, data.ticketId), eq(tickets.outingId, outing.id)),
  });
  if (!ticket) {
    return { message: "Billet introuvable." };
  }
  if (ticket.revokedAt) {
    // Idempotent : déjà révoqué = no-op silencieux côté UI.
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
      action: AUDIT_ACTION.TICKET_REVOKED,
      ipHash: await hashIp(),
      payload: JSON.stringify({
        ticketId: ticket.id,
        scope: ticket.scope,
        participantId: ticket.participantId,
      }),
    });
  });

  // On ne supprime PAS le blob ici : le ticket reste consultable côté DB
  // (audit, debug) et le revokedAt suffit à bloquer l'accès (voir
  // ticket-auth.ts). Un cleanup retardé pourra purger les blobs des
  // tickets revoked depuis > N jours.

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}`);
  revalidatePath(`/${canonical}/billets`);
  return {};
}
