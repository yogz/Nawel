"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { encryptSecret } from "@/lib/crypto";
import { outings, participants, purchaserPaymentMethods } from "@drizzle/sortie-schema";
import { sanitizeStrictText } from "@/lib/sanitize";
import { ensureParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { ibanPreview, isValidIban, normalizeIban, phonePreview } from "@/features/sortie/lib/iban";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import type { FormActionState } from "./outing-actions";
import { shortIdSchema } from "./schemas";

const addMethodSchema = z.discriminatedUnion("type", [
  z.object({
    shortId: shortIdSchema,
    type: z.literal("iban"),
    value: z
      .string()
      .trim()
      .min(14)
      .max(44)
      .refine((v) => isValidIban(v), "IBAN invalide"),
    displayLabel: z.string().trim().max(100).optional(),
  }),
  z.object({
    shortId: shortIdSchema,
    type: z.enum(["lydia", "revolut", "wero"]),
    value: z.string().trim().min(4).max(50),
    displayLabel: z.string().trim().max(100).optional(),
  }),
]);

const removeMethodSchema = z.object({
  shortId: shortIdSchema,
  methodId: z.string().uuid(),
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
  return row ?? null;
}

export async function addPaymentMethodAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = addMethodSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, data.shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  const me = await getCurrentParticipant(outing.id);
  if (!me) {
    return { message: "Tu dois répondre à la sortie avant d'ajouter un moyen de paiement." };
  }

  const gate = await rateLimit({
    key: `addmethod:${me.id}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  const canonicalValue = data.type === "iban" ? normalizeIban(data.value) : data.value.trim();
  const valueEncrypted = encryptSecret(canonicalValue);
  const valuePreview =
    data.type === "iban" ? ibanPreview(canonicalValue) : phonePreview(canonicalValue);
  const displayLabel = data.displayLabel ? sanitizeStrictText(data.displayLabel, 100) : null;

  await db.insert(purchaserPaymentMethods).values({
    participantId: me.id,
    type: data.type,
    valueEncrypted,
    valuePreview,
    displayLabel,
  });

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}/paiement`);
  return {};
}

export async function removePaymentMethodAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = removeMethodSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, parsed.data.shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  const me = await getCurrentParticipant(outing.id);
  if (!me) {
    return { message: "Non autorisé." };
  }

  // The participant ownership check is a WHERE clause — deleting a row the
  // caller doesn't own is a no-op, no leakage of whether the id exists.
  await db
    .delete(purchaserPaymentMethods)
    .where(
      and(
        eq(purchaserPaymentMethods.id, parsed.data.methodId),
        eq(purchaserPaymentMethods.participantId, me.id)
      )
    );

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}/paiement`);
  return {};
}
