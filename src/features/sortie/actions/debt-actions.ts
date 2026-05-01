"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { auditLog, debts, outings, purchaserPaymentMethods } from "@drizzle/sortie-schema";
import { createHash } from "node:crypto";
import {
  sendDebtReminderEmail,
  sendPaymentConfirmedEmail,
  sendPaymentDeclaredEmail,
} from "@/features/sortie/lib/emails/send-money-emails";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { rateLimit, getClientIp } from "@/features/sortie/lib/rate-limit";
import { formDataToObject } from "@/features/sortie/lib/form-data";
import { getCurrentParticipant } from "@/features/sortie/lib/current-participant";
import type { FormActionState } from "./outing-actions";
import { shortIdSchema } from "./schemas";

// Source unique pour les valeurs auditLog.action écrites par debt-actions.
// Évite les typos silencieux (le champ est `varchar(64)` libre côté Drizzle,
// donc une faute de frappe ne casse pas le build mais brise la requêtabilité).
const AUDIT_ACTION = {
  DEBT_DECLARED_PAID: "DEBT_DECLARED_PAID",
  DEBT_CONFIRMED: "DEBT_CONFIRMED",
  DEBT_REMINDED: "DEBT_REMINDED",
  IBAN_REVEALED: "IBAN_REVEALED",
} as const;

// Combien de temps un créancier doit attendre entre deux relances email
// pour la même dette. Garde-fou anti-spam — si tu cliques trop vite, on
// te dit non plutôt que de bombarder le débiteur.
const REMINDER_COOLDOWN_HOURS = 48;

const debtSchema = z.object({
  shortId: shortIdSchema,
  debtId: z.string().uuid(),
});

const revealIbanSchema = z.object({
  shortId: shortIdSchema,
  methodId: z.string().uuid(),
  debtId: z.string().uuid(),
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

  // Transaction : update debt + insert audit log atomiques. L'audit log
  // est append-only : un crash post-update qui laisse l'event sans trace
  // brise la promesse de traçabilité des transitions de paiement.
  // Email reste hors transaction (fire-and-forget Resend).
  const ipHash = await hashIp();
  const updated = await db.transaction(async (tx) => {
    // Debtor-only transition. WHERE + status guard doubles as an idempotency
    // check — a second click after confirmation is a no-op.
    const [row] = await tx
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

    if (row) {
      await tx.insert(auditLog).values({
        outingId: outing.id,
        actorParticipantId: participant.id,
        actorUserId: userId,
        action: AUDIT_ACTION.DEBT_DECLARED_PAID,
        ipHash,
        payload: JSON.stringify({ debtId: row.id }),
      });
    }
    return row;
  });

  if (updated) {
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

  // Transaction : update debt + audit log atomiques (idem markDebtPaid).
  const ipHash = await hashIp();
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(debts)
      .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(debts.id, parsed.data.debtId), eq(debts.creditorParticipantId, participant.id)))
      .returning({ id: debts.id });

    if (row) {
      await tx.insert(auditLog).values({
        outingId: outing.id,
        actorParticipantId: participant.id,
        actorUserId: userId,
        action: AUDIT_ACTION.DEBT_CONFIRMED,
        ipHash,
        payload: JSON.stringify({ debtId: row.id }),
      });
    }
    return row;
  });

  if (updated) {
    await sendPaymentConfirmedEmail({
      outing: { title: outing.title, slug: outing.slug, shortId: outing.shortId },
      debtId: updated.id,
    });
  }

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}/dettes`);
  return {};
}

/**
 * Bouton « Relancer par email » côté créancier. Envoie un
 * `debtReminderEmail` au débiteur avec rate-limit 1×/48h par dette
 * (vérifié via audit_log — pas de colonne DB dédiée). Le contrôle
 * d'accès est : créancier de cette dette uniquement, status != confirmed
 * (relancer une dette déjà réglée n'a pas de sens et serait gênant).
 */
export async function remindDebtAction(
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

  // Vérif d'accès + état : créancier de cette dette ET non confirmée.
  const debt = await db.query.debts.findFirst({
    where: and(
      eq(debts.id, parsed.data.debtId),
      eq(debts.outingId, outing.id),
      eq(debts.creditorParticipantId, participant.id)
    ),
    columns: { id: true, status: true },
  });
  if (!debt || debt.status === "confirmed") {
    return { message: "Cette dette ne peut pas être relancée." };
  }

  // Rate-limit via audit_log : on cherche une entry DEBT_REMINDED sur
  // ce debtId dans les `REMINDER_COOLDOWN_HOURS` dernières heures.
  // payload est stocké en text JSON ; cast en jsonb pour le matcher.
  const recent = await db.query.auditLog.findFirst({
    where: and(
      eq(auditLog.action, AUDIT_ACTION.DEBT_REMINDED),
      sql`${auditLog.payload}::jsonb ->> 'debtId' = ${parsed.data.debtId}`,
      sql`${auditLog.createdAt} > NOW() - (${REMINDER_COOLDOWN_HOURS} || ' hours')::interval`
    ),
    orderBy: desc(auditLog.createdAt),
    columns: { createdAt: true },
  });
  if (recent) {
    return {
      message: `Tu as déjà relancé récemment. Réessaie dans quelques heures.`,
    };
  }

  // Audit log écrit AVANT l'envoi : on préfère un log fantôme (rare,
  // si Resend down) qu'un envoi non tracé qui contournerait le cooldown.
  const ipHash = await hashIp();
  await db.insert(auditLog).values({
    outingId: outing.id,
    actorParticipantId: participant.id,
    actorUserId: userId,
    action: AUDIT_ACTION.DEBT_REMINDED,
    ipHash,
    payload: JSON.stringify({ debtId: debt.id }),
  });

  await sendDebtReminderEmail({
    outing: { title: outing.title, slug: outing.slug, shortId: outing.shortId },
    debtId: debt.id,
  });

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
  // Pas de révélation d'IBAN sur une sortie annulée : la dette n'a plus
  // à être réglée et l'IBAN est une donnée sensible. Côté UI la dette
  // reste affichée pour l'historique mais le bouton "voir l'IBAN" doit
  // bloquer côté serveur même si l'utilisateur force le call.
  if (outing.status === "cancelled") {
    return { ok: false, message: "Sortie annulée." };
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

  // Transaction : décryptage + écriture de l'audit log atomiques. Si
  // l'audit log échoue après le décryptage, on rollback — on préfère
  // refuser la révélation plutôt que de la servir sans trace
  // (l'auditabilité est la garantie qui justifie le décryptage).
  const ipHash = await hashIp();
  const value = await db.transaction(async (tx) => {
    const decrypted = decryptSecret(method.valueEncrypted);
    await tx.insert(auditLog).values({
      outingId: outing.id,
      actorParticipantId: participant.id,
      actorUserId: userId,
      action: AUDIT_ACTION.IBAN_REVEALED,
      ipHash,
      payload: JSON.stringify({ methodId, debtId }),
    });
    return decrypted;
  });

  return { ok: true, value };
}
