"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { decryptSecret } from "@/lib/crypto";
import {
  auditLog,
  debts,
  outings,
  participants,
  purchaserPaymentMethods,
} from "@drizzle/sortie-schema";
import { createHash } from "node:crypto";
import { ensureParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import {
  sendPaymentConfirmedEmail,
  sendPaymentDeclaredEmail,
} from "@/features/sortie/lib/emails/send-money-emails";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { rateLimit, getClientIp } from "@/features/sortie/lib/rate-limit";
import type { FormActionState } from "./outing-actions";

const shortIdSchema = z
  .string()
  .trim()
  .regex(/^[23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);

const debtSchema = z.object({
  shortId: shortIdSchema,
  debtId: z.string().uuid(),
});

const revealIbanSchema = z.object({
  shortId: shortIdSchema,
  methodId: z.string().uuid(),
  debtId: z.string().uuid(),
});

function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    obj[k] = typeof v === "string" ? v : "";
  }
  return obj;
}

async function getCurrentParticipant(outingId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const cookieTokenHash = await ensureParticipantTokenHash();
  const userId = session?.user?.id ?? null;
  const row = await db.query.participants.findFirst({
    where: and(
      eq(participants.outingId, outingId),
      userId ? eq(participants.userId, userId) : eq(participants.cookieTokenHash, cookieTokenHash)
    ),
  });
  return { participant: row ?? null, userId };
}

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

export async function markDebtPaidAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = debtSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, parsed.data.shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  const { participant, userId } = await getCurrentParticipant(outing.id);
  if (!participant) {
    return { message: "Non autorisé." };
  }

  // Debtor-only transition. WHERE + status guard doubles as an idempotency
  // check — a second click after confirmation is a no-op.
  const [updated] = await db
    .update(debts)
    .set({ status: "declared_paid", declaredAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(debts.id, parsed.data.debtId),
        eq(debts.debtorParticipantId, participant.id),
        eq(debts.status, "pending")
      )
    )
    .returning({ id: debts.id });

  if (updated) {
    await db.insert(auditLog).values({
      outingId: outing.id,
      actorParticipantId: participant.id,
      actorUserId: userId,
      action: "DEBT_DECLARED_PAID",
      ipHash: await hashIp(),
      payload: JSON.stringify({ debtId: updated.id }),
    });
    await sendPaymentDeclaredEmail({
      outing: { title: outing.title, slug: outing.slug, shortId: outing.shortId },
      debtId: updated.id,
    });
  }

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}/dettes`);
  return {};
}

export async function confirmDebtPaidAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = debtSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, parsed.data.shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  const { participant, userId } = await getCurrentParticipant(outing.id);
  if (!participant) {
    return { message: "Non autorisé." };
  }

  const [updated] = await db
    .update(debts)
    .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(debts.id, parsed.data.debtId), eq(debts.creditorParticipantId, participant.id)))
    .returning({ id: debts.id });

  if (updated) {
    await db.insert(auditLog).values({
      outingId: outing.id,
      actorParticipantId: participant.id,
      actorUserId: userId,
      action: "DEBT_CONFIRMED",
      ipHash: await hashIp(),
      payload: JSON.stringify({ debtId: updated.id }),
    });
    await sendPaymentConfirmedEmail({
      outing: { title: outing.title, slug: outing.slug, shortId: outing.shortId },
      debtId: updated.id,
    });
  }

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}/dettes`);
  return {};
}

type RevealResult = { ok: true; value: string } | { ok: false; message: string };

/**
 * Decrypt and return a payment method's full value — only for an active
 * debtor of the method's owner, rate-limited, and always logged. The caller
 * is expected to render the value briefly and then drop it from the DOM.
 */
export async function revealIbanAction(input: unknown): Promise<RevealResult> {
  const parsed = revealIbanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Paramètres invalides." };
  }
  const { shortId, methodId, debtId } = parsed.data;

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
  });
  if (!outing) {
    return { ok: false, message: "Sortie introuvable." };
  }

  const { participant, userId } = await getCurrentParticipant(outing.id);
  if (!participant) {
    return { ok: false, message: "Non autorisé." };
  }

  const gate = await rateLimit({
    key: `reveal:${participant.id}`,
    limit: 30,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { ok: false, message: gate.message };
  }

  // The debt must exist, be owed by the caller, point at the method's owner,
  // and not be confirmed yet (no point revealing after the loop is closed).
  const debt = await db.query.debts.findFirst({
    where: and(
      eq(debts.id, debtId),
      eq(debts.outingId, outing.id),
      eq(debts.debtorParticipantId, participant.id)
    ),
  });
  if (!debt || debt.status === "confirmed") {
    return { ok: false, message: "Accès refusé." };
  }

  const method = await db.query.purchaserPaymentMethods.findFirst({
    where: and(
      eq(purchaserPaymentMethods.id, methodId),
      eq(purchaserPaymentMethods.participantId, debt.creditorParticipantId)
    ),
  });
  if (!method) {
    return { ok: false, message: "Moyen introuvable." };
  }

  const value = decryptSecret(method.valueEncrypted);

  await db.insert(auditLog).values({
    outingId: outing.id,
    actorParticipantId: participant.id,
    actorUserId: userId,
    action: "IBAN_REVEALED",
    ipHash: await hashIp(),
    payload: JSON.stringify({ methodId, debtId }),
  });

  return { ok: true, value };
}
