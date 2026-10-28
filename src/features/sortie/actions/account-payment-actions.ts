"use server";

import { and, eq, isNull, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { encryptSecret } from "@/lib/crypto";
import { sanitizeStrictText } from "@/lib/sanitize";
import { auditLog, userPaymentMethods } from "@drizzle/sortie-schema";
import { ibanPreview, normalizeIban, phonePreview } from "@/features/sortie/lib/iban";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { ACCOUNT_PAYMENT_AUDIT_ACTION, hashIp } from "@/features/sortie/lib/audit";
import { formDataToObject } from "@/features/sortie/lib/form-data";
import {
  checkAccountMethodAdd,
  MAX_LABEL_LENGTH,
  mayManageAccountMethods,
  PAYMENT_TYPE_LABEL,
  validateMethodLabel,
} from "@/features/sortie/lib/account-payment/rules";
import { newConfirmToken } from "@/features/sortie/lib/account-payment/confirm-token";
import {
  sendAccountMethodChangedEmail,
  sendAccountMethodConfirmEmail,
} from "@/features/sortie/lib/emails/send-account-payment-emails";
import { handleValueSchema, ibanValueSchema } from "./schemas";

/**
 * Moyens de paiement enregistrés sur le compte, gérés depuis « Mon argent ».
 * Cf. spec 2026-10-28-sortie-account-payment-methods-design.md §5 bis :
 *   - `session.user` requis, e-mail vérifié — jamais le cookie de participation ;
 *   - un ajout reste en attente jusqu'au lien envoyé à l'adresse du compte ;
 *   - aucune valeur claire dans l'audit, les e-mails ou la réponse.
 */

export type AccountPaymentActionState = {
  errors?: Record<string, string[]>;
  message?: string;
  /** Retour positif (affiché comme une confirmation, pas une erreur). */
  notice?: string;
};

// Le libellé est validé par `validateMethodLabel` (40 caractères, pas de
// numéro) ; la borne Zod ne sert qu'à rejeter un champ démesuré.
const addAccountMethodSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("iban"),
    value: ibanValueSchema,
    displayLabel: z.string().max(200).optional(),
  }),
  z.object({
    type: z.enum(["lydia", "revolut", "wero"]),
    value: handleValueSchema,
    displayLabel: z.string().max(200).optional(),
  }),
]);

const removeAccountMethodSchema = z.object({
  methodId: z.string().uuid(),
});

async function getManagingUser(): Promise<
  { ok: true; userId: string; email: string } | { ok: false; message: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user;
  if (!u) {
    return { ok: false, message: "Connecte-toi pour gérer tes moyens de paiement." };
  }
  if (!mayManageAccountMethods({ userId: u.id, emailVerified: u.emailVerified ?? null })) {
    return {
      ok: false,
      message: "Confirme d'abord ton adresse e-mail pour enregistrer un moyen de paiement.",
    };
  }
  return { ok: true, userId: u.id, email: u.email };
}

export async function addAccountPaymentMethodAction(
  _prev: AccountPaymentActionState,
  formData: FormData
): Promise<AccountPaymentActionState> {
  const who = await getManagingUser();
  if (!who.ok) {
    return { message: who.message };
  }

  const parsed = addAccountMethodSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const label = validateMethodLabel(data.displayLabel);
  if (!label.ok) {
    return { errors: { displayLabel: [label.message] } };
  }
  // Même nettoyage que l'ajout par sortie ; un libellé réduit à rien
  // (que des caractères refusés) devient « pas de libellé ».
  const displayLabel = label.label
    ? sanitizeStrictText(label.label, MAX_LABEL_LENGTH) || null
    : null;

  const gate = await rateLimit({
    key: `acct-pm:${who.userId}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  const canonicalValue = data.type === "iban" ? normalizeIban(data.value) : data.value.trim();
  const valuePreview =
    data.type === "iban" ? ibanPreview(canonicalValue) : phonePreview(canonicalValue);

  const now = new Date();
  // Les ajouts jamais confirmés dont le lien a expiré ne servent plus à
  // rien : on les retire pour qu'ils ne bloquent pas un nouvel essai
  // (doublon) ni n'encombrent la liste.
  await db
    .delete(userPaymentMethods)
    .where(
      and(
        eq(userPaymentMethods.userId, who.userId),
        isNull(userPaymentMethods.confirmedAt),
        lt(userPaymentMethods.confirmTokenExpiresAt, now)
      )
    );

  const existing = await db
    .select({
      type: userPaymentMethods.type,
      valuePreview: userPaymentMethods.valuePreview,
      confirmedAt: userPaymentMethods.confirmedAt,
    })
    .from(userPaymentMethods)
    .where(eq(userPaymentMethods.userId, who.userId));

  const check = checkAccountMethodAdd({ existing, type: data.type, valuePreview });
  if (!check.ok) {
    return { message: check.message };
  }

  const valueEncrypted = encryptSecret(canonicalValue);
  const { token, tokenHash, expiresAt } = newConfirmToken(now);
  const ipHash = await hashIp();

  await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(userPaymentMethods)
      .values({
        userId: who.userId,
        type: data.type,
        valueEncrypted,
        valuePreview,
        displayLabel,
        confirmTokenHash: tokenHash,
        confirmTokenExpiresAt: expiresAt,
      })
      .returning({ id: userPaymentMethods.id });

    await tx.insert(auditLog).values({
      outingId: null,
      actorUserId: who.userId,
      action: ACCOUNT_PAYMENT_AUDIT_ACTION.USER_PAYMENT_METHOD_ADDED,
      ipHash,
      payload: JSON.stringify({ methodId: inserted.id, type: data.type, valuePreview }),
    });
  });

  await sendAccountMethodConfirmEmail({
    to: who.email,
    type: data.type,
    valuePreview,
    displayLabel,
    token,
  });

  revalidatePath("/moi/argent");
  return {
    notice: `${PAYMENT_TYPE_LABEL[data.type]} ajouté : confirme-le depuis le mail qu'on vient de t'envoyer.`,
  };
}

export async function removeAccountPaymentMethodAction(
  _prev: AccountPaymentActionState,
  formData: FormData
): Promise<AccountPaymentActionState> {
  const who = await getManagingUser();
  if (!who.ok) {
    return { message: who.message };
  }

  const parsed = removeAccountMethodSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const ipHash = await hashIp();
  const removed = await db.transaction(async (tx) => {
    // Le propriétaire est dans le WHERE : retirer le moyen d'un autre compte
    // est un no-op, sans révéler si l'id existe.
    const [row] = await tx
      .delete(userPaymentMethods)
      .where(
        and(
          eq(userPaymentMethods.id, parsed.data.methodId),
          eq(userPaymentMethods.userId, who.userId)
        )
      )
      .returning({
        id: userPaymentMethods.id,
        type: userPaymentMethods.type,
        valuePreview: userPaymentMethods.valuePreview,
      });

    if (row) {
      await tx.insert(auditLog).values({
        outingId: null,
        actorUserId: who.userId,
        action: ACCOUNT_PAYMENT_AUDIT_ACTION.USER_PAYMENT_METHOD_REMOVED,
        ipHash,
        payload: JSON.stringify({
          methodId: row.id,
          type: row.type,
          valuePreview: row.valuePreview,
        }),
      });
    }
    return row ?? null;
  });

  if (!removed) {
    return { message: "Ce moyen de paiement n'existe plus." };
  }

  await sendAccountMethodChangedEmail({
    to: who.email,
    change: "removed",
    type: removed.type,
    valuePreview: removed.valuePreview,
  });

  revalidatePath("/moi/argent");
  return { notice: "Retiré de ton compte. Les sorties déjà achetées gardent l'ancien." };
}
