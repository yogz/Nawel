"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { auditLog, outings, participants, purchases } from "@drizzle/sortie-schema";
import { OUTING_AUDIT_ACTION } from "@/features/sortie/lib/audit";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { findRegularByViewKey, groupRegulars } from "@/features/sortie/lib/already-bought/regulars";
import {
  MAX_PEOPLE_PER_CALL,
  planParticipants,
} from "@/features/sortie/lib/already-bought/participant-plan";
import { listRegularRows } from "@/features/sortie/queries/regulars-queries";
import { shortIdSchema } from "./schemas";
import type { FormActionState } from "./outing-actions";

const extras = {
  extraAdults: z.number().int().min(0).max(10),
  extraChildren: z.number().int().min(0).max(10),
};

const payloadSchema = z.object({
  shortId: shortIdSchema,
  people: z
    .array(
      z.union([
        z.object({ self: z.literal(true), ...extras }),
        z.object({ key: z.string().min(1).max(64), ...extras }),
        z.object({
          newName: z.string().max(100),
          newEmail: z.string().max(255).nullable(),
          ...extras,
        }),
      ])
    )
    .max(MAX_PEOPLE_PER_CALL + 1),
});

/**
 * « Continuer » sur la page « Qui vient ? » d'une sortie « billets déjà
 * pris ». Réservé à l'organisateur réellement connecté (jamais via le seul
 * cookie : cf. already-bought/rules.ts). La liste envoyée REMPLACE les
 * participants (sauf l'organisateur), puis on enchaîne sur l'achat.
 */
export async function saveWhoIsComingAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  let payload: z.infer<typeof payloadSchema>;
  try {
    const parsed = payloadSchema.safeParse(JSON.parse(String(formData.get("payload") ?? "")));
    if (!parsed.success) {
      return { message: "Ça n'a pas marché. Réessaie." };
    }
    payload = parsed.data;
  } catch {
    return { message: "Ça n'a pas marché. Réessaie." };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return { message: "Connecte-toi pour choisir qui vient." };
  }

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, payload.shortId),
  });
  if (
    !outing ||
    !outing.alreadyBought ||
    outing.status === "cancelled" ||
    outing.creatorUserId !== userId
  ) {
    return { message: "Sortie introuvable." };
  }

  const gate = await rateLimit({
    key: `add-participants:${userId}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    return { message: "Ça n'a pas marché. Réessaie." };
  }
  const regulars = groupRegulars(await listRegularRows(userId), userId);
  const newEmailsToday = await countNewEmailsToday(userId);
  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });

  const result = await db.transaction(async (tx) => {
    // Verrou : deux onglets / un achat déclaré entre-temps ne doivent pas
    // produire une liste incohérente avec les dettes.
    await tx.execute(sql`select id from sortie.outings where id = ${outing.id} for update`);
    const purchase = await tx.query.purchases.findFirst({
      where: eq(purchases.outingId, outing.id),
      columns: { id: true },
    });
    const current = await tx
      .select({
        id: participants.id,
        userId: participants.userId,
        anonName: participants.anonName,
        anonEmail: participants.anonEmail,
        extraAdults: participants.extraAdults,
        extraChildren: participants.extraChildren,
      })
      .from(participants)
      .where(eq(participants.outingId, outing.id));
    const creatorRow = current.find((r) => r.userId === userId);
    if (!creatorRow) {
      return { ok: false as const, message: "Sortie introuvable." };
    }

    const plan = planParticipants({
      current,
      creatorParticipantId: creatorRow.id,
      requested: payload.people,
      resolveKey: (key) => findRegularByViewKey(regulars, key, secret),
      hasPurchase: purchase !== undefined,
      newEmailsToday,
    });
    if (!plan.ok) {
      return plan;
    }

    if (plan.inserts.length > 0) {
      await tx.insert(participants).values(
        plan.inserts.map((r) => ({
          outingId: outing.id,
          ...r,
          response: "yes" as const,
          // Même technique que l'assignation admin : un hash aléatoire qui ne
          // correspondra jamais à un vrai cookie (contrainte NOT NULL + unique).
          cookieTokenHash: createHash("sha256").update(randomBytes(32)).digest("hex"),
        }))
      );
    }
    for (const u of plan.updates) {
      await tx
        .update(participants)
        .set({ extraAdults: u.extraAdults, extraChildren: u.extraChildren, updatedAt: new Date() })
        .where(and(eq(participants.id, u.id), eq(participants.outingId, outing.id)));
    }
    for (const id of plan.deleteIds) {
      await tx
        .delete(participants)
        .where(and(eq(participants.id, id), eq(participants.outingId, outing.id)));
    }
    await tx.insert(auditLog).values({
      outingId: outing.id,
      actorUserId: userId,
      action: OUTING_AUDIT_ACTION.PARTICIPANTS_SET_BY_CREATOR,
      payload: JSON.stringify({
        inserted: plan.inserts.length,
        updated: plan.updates.length,
        deleted: plan.deleteIds.length,
        newEmailCount: plan.newEmailCount,
      }),
    });
    return plan;
  });

  if (!result.ok) {
    if ("redirectTo" in result && result.redirectTo === "dettes") {
      redirect(`/${canonical}/dettes`);
    }
    return { message: result.message };
  }

  revalidatePath(`/${canonical}`);
  revalidatePath("/sortie/agenda");
  redirect(`/${canonical}/achat`);
}

/** Nouvelles adresses saisies par cet organisateur sur 24 h (journal d'audit). */
async function countNewEmailsToday(userId: string): Promise<number> {
  const rows = await db
    .select({ payload: auditLog.payload })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.actorUserId, userId),
        eq(auditLog.action, OUTING_AUDIT_ACTION.PARTICIPANTS_SET_BY_CREATOR),
        gt(auditLog.createdAt, new Date(Date.now() - 86_400_000))
      )
    );
  return rows.reduce((sum, r) => {
    try {
      return sum + (Number(JSON.parse(r.payload ?? "{}").newEmailCount) || 0);
    } catch {
      return sum;
    }
  }, 0);
}
