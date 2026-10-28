"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { auditLog, outings, purchaserPaymentMethods, purchases } from "@drizzle/sortie-schema";
import { ibanPreview, normalizeIban, phonePreview } from "@/features/sortie/lib/iban";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { hashIp } from "@/features/sortie/lib/audit";
import { formDataToObject } from "@/features/sortie/lib/form-data";
import { getCurrentParticipant } from "@/features/sortie/lib/current-participant";
import {
  checkOutingMethodAdd,
  validateMethodLabel,
  mayEditOutingMethods,
} from "@/features/sortie/lib/account-payment/rules";
import type { FormActionState } from "./outing-actions";
import { handleValueSchema, ibanValueSchema, shortIdSchema } from "./schemas";

// Valeurs auditLog.action — typo silencieuse possible côté varchar(64),
// donc on les fige ici.
const AUDIT_ACTION = {
  PAYMENT_METHOD_ADDED: "PAYMENT_METHOD_ADDED",
  PAYMENT_METHOD_REMOVED: "PAYMENT_METHOD_REMOVED",
} as const;

const addMethodSchema = z.discriminatedUnion("type", [
  z.object({
    shortId: shortIdSchema,
    type: z.literal("iban"),
    value: ibanValueSchema,
    displayLabel: z.string().trim().max(100).optional(),
  }),
  z.object({
    shortId: shortIdSchema,
    type: z.enum(["lydia", "revolut", "wero"]),
    value: handleValueSchema,
    displayLabel: z.string().trim().max(100).optional(),
  }),
]);

const removeMethodSchema = z.object({
  shortId: shortIdSchema,
  methodId: z.string().uuid(),
});

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

  const { participant: me, userId } = await getCurrentParticipant(outing.id);
  if (!me) {
    return { message: "Tu dois répondre à la sortie avant d'ajouter un moyen de paiement." };
  }
  // Ligne rattachée à un compte (ex. rattachement par e-mail à la connexion,
  // qui laisse le cookie en place) : le cookie seul ne suffit plus.
  if (!mayEditOutingMethods({ rowUserId: me.userId, sessionUserId: userId })) {
    return { message: "Connecte-toi avec ton compte pour modifier tes moyens de paiement." };
  }

  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.outingId, outing.id),
    columns: { purchaserParticipantId: true },
  });
  if (!purchase || purchase.purchaserParticipantId !== me.id) {
    return { message: "Seul l'acheteur de la sortie peut renseigner un moyen de paiement." };
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
  // Même contrôle que les moyens du compte : ce libellé s'affiche chez les
  // débiteurs, il ne doit pas pouvoir porter un numéro (cf. rules.ts).
  const labelCheck = validateMethodLabel(data.displayLabel);
  if (!labelCheck.ok) {
    return { errors: { displayLabel: [labelCheck.message] } };
  }
  const displayLabel = labelCheck.label;

  const existing = await db
    .select({
      type: purchaserPaymentMethods.type,
      valuePreview: purchaserPaymentMethods.valuePreview,
    })
    .from(purchaserPaymentMethods)
    .where(eq(purchaserPaymentMethods.participantId, me.id));
  const check = checkOutingMethodAdd({ existing, type: data.type, valuePreview });
  if (!check.ok) {
    return { message: check.message };
  }

  const ipHash = await hashIp();
  await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(purchaserPaymentMethods)
      .values({
        participantId: me.id,
        type: data.type,
        valueEncrypted,
        valuePreview,
        displayLabel,
      })
      .returning({ id: purchaserPaymentMethods.id });

    await tx.insert(auditLog).values({
      outingId: outing.id,
      actorParticipantId: me.id,
      actorUserId: userId,
      action: AUDIT_ACTION.PAYMENT_METHOD_ADDED,
      ipHash,
      // Pas de valeur claire dans le payload — uniquement le type et le
      // preview (4 derniers chars). L'audit doit retracer "qui a ajouté
      // quoi quand", pas conserver le secret.
      payload: JSON.stringify({
        methodId: inserted.id,
        type: data.type,
        valuePreview,
      }),
    });
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

  const { participant: me, userId } = await getCurrentParticipant(outing.id);
  if (!me || !mayEditOutingMethods({ rowUserId: me.userId, sessionUserId: userId })) {
    return { message: "Non autorisé." };
  }

  const ipHash = await hashIp();
  await db.transaction(async (tx) => {
    // The participant ownership check is a WHERE clause — deleting a row
    // the caller doesn't own is a no-op, no leakage of whether the id
    // exists. `.returning()` lets us audit-log only on an actual delete.
    const removed = await tx
      .delete(purchaserPaymentMethods)
      .where(
        and(
          eq(purchaserPaymentMethods.id, parsed.data.methodId),
          eq(purchaserPaymentMethods.participantId, me.id)
        )
      )
      .returning({ id: purchaserPaymentMethods.id });

    if (removed.length > 0) {
      await tx.insert(auditLog).values({
        outingId: outing.id,
        actorParticipantId: me.id,
        actorUserId: userId,
        action: AUDIT_ACTION.PAYMENT_METHOD_REMOVED,
        ipHash,
        payload: JSON.stringify({ methodId: parsed.data.methodId }),
      });
    }
  });

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}/paiement`);
  return {};
}
