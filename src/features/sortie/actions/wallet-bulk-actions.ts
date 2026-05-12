"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { auditLog, debts } from "@drizzle/sortie-schema";
import { getDebtsBetweenUsers } from "@/features/sortie/queries/wallet-bulk-queries";
import { getClientIp, rateLimit } from "@/features/sortie/lib/rate-limit";
import {
  sendBulkPaymentDeclaredEmail,
  sendBulkSettledEmail,
  sendDebtBulkReminderEmail,
} from "@/features/sortie/lib/emails/send-money-emails";

/**
 * Source unique pour les valeurs `auditLog.action` écrites par les
 * actions bulk wallet. Les actions par-dette continuent d'utiliser les
 * constantes de `debt-actions.ts` ; les noms `BULK_*` permettent
 * d'enforcer un cooldown séparé du flux per-debt.
 */
const AUDIT_ACTION = {
  BULK_DEBTS_REMINDED: "BULK_DEBTS_REMINDED",
  BULK_DEBTS_DECLARED_PAID: "BULK_DEBTS_DECLARED_PAID",
  BULK_DEBTS_SETTLED: "BULK_DEBTS_SETTLED",
  DEBT_DECLARED_PAID: "DEBT_DECLARED_PAID",
  DEBT_CONFIRMED: "DEBT_CONFIRMED",
  BULK_EMAIL_SEND_FAILED: "BULK_EMAIL_SEND_FAILED",
} as const;

const REMINDER_COOLDOWN_HOURS = 48;

// Better Auth utilise des IDs string (pas UUID strict) — on accepte
// n'importe quelle chaîne courte. Le double-bind authz au niveau query
// empêche d'exploiter un userId mal-formé.
const userIdSchema = z.string().min(1).max(64);

const bulkInputSchema = z.object({
  otherUserId: userIdSchema,
});

export type BulkActionResult =
  | { ok: true }
  | {
      ok: false;
      code: "unauthorized" | "rate_limited" | "cooldown" | "invalid" | "nothing_todo" | "error";
    };

/**
 * Réponses uniformes : la valeur de retour ne révèle jamais quel cas
 * spécifique a échoué côté serveur (cf. revue sécu §5 anti-énumération
 * email). Les variations possibles : success vs. cooldown vs. rate_limited
 * vs. unauthorized ; pas de différentiation entre "0 dette" et "envoyé".
 */
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

async function requireSession(): Promise<{ userId: string } | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return null;
  }
  return { userId: session.user.id };
}

/**
 * Relance groupée : un seul email récap envoyé au débiteur listant
 * toutes les dettes pending dans le couple (caller=créditeur, target=débiteur).
 *
 * Sécurité :
 * - Double-bind authz via `getDebtsBetweenUsers` (chaque dette doit avoir
 *   son participant créditeur lié au caller ET son participant débiteur
 *   lié à `debtorUserId`).
 * - Redis pre-gate 1 call / 60s pour fermer la fenêtre TOCTOU entre 2
 *   submits parallèles.
 * - Cooldown 48h par couple via audit_log (`BULK_DEBTS_REMINDED` +
 *   match payload sur les deux userIds).
 * - Audit row écrite AVANT envoi : un crash post-audit ne bypass pas le
 *   cooldown même si le mail n'est jamais parti.
 * - Response uniforme : "ok" peu importe le nombre de dettes trouvées,
 *   pour ne pas leaker la présence/absence de relations financières.
 */
export async function remindAllDebtsAction(input: unknown): Promise<BulkActionResult> {
  const parsed = bulkInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid" };
  }
  const session = await requireSession();
  if (!session) {
    return { ok: false, code: "unauthorized" };
  }
  const callerUserId = session.userId;
  const debtorUserId = parsed.data.otherUserId;
  if (debtorUserId === callerUserId) {
    return { ok: false, code: "invalid" };
  }

  const preGate = await rateLimit({
    key: `wallet-bulk-remind:${callerUserId}:${debtorUserId}`,
    limit: 1,
    windowSeconds: 60,
  });
  if (!preGate.ok) {
    return { ok: false, code: "rate_limited" };
  }

  const recent = await db.query.auditLog.findFirst({
    where: and(
      eq(auditLog.action, AUDIT_ACTION.BULK_DEBTS_REMINDED),
      sql`${auditLog.payload}::jsonb ->> 'creditorUserId' = ${callerUserId}`,
      sql`${auditLog.payload}::jsonb ->> 'debtorUserId' = ${debtorUserId}`,
      sql`${auditLog.createdAt} > NOW() - (${REMINDER_COOLDOWN_HOURS} || ' hours')::interval`
    ),
    orderBy: desc(auditLog.createdAt),
    columns: { id: true },
  });
  if (recent) {
    return { ok: false, code: "cooldown" };
  }

  const { asCreditor } = await getDebtsBetweenUsers({
    callerUserId,
    otherUserId: debtorUserId,
    statuses: ["pending"],
  });

  if (asCreditor.length === 0) {
    return { ok: true };
  }

  const totalCents = asCreditor.reduce((sum, d) => sum + d.amountCents, 0);
  const items = asCreditor.map((d) => ({
    outingTitle: d.outingTitle,
    amountCents: d.amountCents,
  }));
  const actorParticipantId = asCreditor[0]!.creditorParticipantId;

  const ipHash = await hashIp();
  const [audit] = await db
    .insert(auditLog)
    .values({
      outingId: null,
      actorParticipantId,
      actorUserId: callerUserId,
      action: AUDIT_ACTION.BULK_DEBTS_REMINDED,
      ipHash,
      payload: JSON.stringify({
        creditorUserId: callerUserId,
        debtorUserId,
        debtIds: asCreditor.map((d) => d.id),
        totalCents,
      }),
    })
    .returning({ id: auditLog.id });

  try {
    await sendDebtBulkReminderEmail({
      debtorUserId,
      creditorUserId: callerUserId,
      items,
      totalCents,
    });
  } catch (err) {
    await db.insert(auditLog).values({
      outingId: null,
      actorParticipantId,
      actorUserId: callerUserId,
      action: AUDIT_ACTION.BULK_EMAIL_SEND_FAILED,
      ipHash,
      payload: JSON.stringify({
        bulkAuditId: audit?.id ?? null,
        reason: err instanceof Error ? err.message : String(err),
      }),
    });
  }

  revalidatePath("/moi/argent");
  return { ok: true };
}

/**
 * Bulk « j'ai tout payé » : marque toutes les dettes pending du caller
 * envers `creditorUserId` comme `declared_paid` en une transaction.
 * Crée N audit `DEBT_DECLARED_PAID` (traçabilité fine) + 1 agrégée
 * `BULK_DEBTS_DECLARED_PAID`. Email après commit.
 */
export async function markAllDebtsPaidAction(input: unknown): Promise<BulkActionResult> {
  const parsed = bulkInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid" };
  }
  const session = await requireSession();
  if (!session) {
    return { ok: false, code: "unauthorized" };
  }
  const callerUserId = session.userId;
  const creditorUserId = parsed.data.otherUserId;
  if (creditorUserId === callerUserId) {
    return { ok: false, code: "invalid" };
  }

  const preGate = await rateLimit({
    key: `wallet-bulk-paid:${callerUserId}:${creditorUserId}`,
    limit: 1,
    windowSeconds: 60,
  });
  if (!preGate.ok) {
    return { ok: false, code: "rate_limited" };
  }

  const { asDebtor } = await getDebtsBetweenUsers({
    callerUserId,
    otherUserId: creditorUserId,
    statuses: ["pending"],
  });
  if (asDebtor.length === 0) {
    return { ok: true };
  }

  const ipHash = await hashIp();
  const actorParticipantId = asDebtor[0]!.debtorParticipantId;
  const targetIds = asDebtor.map((d) => d.id);

  const { updatedIds, totalCents } = await db.transaction(async (tx) => {
    // returning() = source de vérité : si un click concurrent a déjà
    // passé une dette à declared_paid, elle ne ressort pas ici.
    const rows = await tx
      .update(debts)
      .set({ status: "declared_paid", declaredAt: new Date(), updatedAt: new Date() })
      .where(and(inArray(debts.id, targetIds), eq(debts.status, "pending")))
      .returning({ id: debts.id, amountCents: debts.amountCents });

    if (rows.length === 0) {
      return { updatedIds: [], totalCents: 0 };
    }

    await tx.insert(auditLog).values(
      rows.map((r) => ({
        outingId: null,
        actorParticipantId,
        actorUserId: callerUserId,
        action: AUDIT_ACTION.DEBT_DECLARED_PAID,
        ipHash,
        payload: JSON.stringify({ debtId: r.id, via: "bulk_wallet" }),
      }))
    );

    const total = rows.reduce((s, r) => s + r.amountCents, 0);
    await tx.insert(auditLog).values({
      outingId: null,
      actorParticipantId,
      actorUserId: callerUserId,
      action: AUDIT_ACTION.BULK_DEBTS_DECLARED_PAID,
      ipHash,
      payload: JSON.stringify({
        debtorUserId: callerUserId,
        creditorUserId,
        debtIds: rows.map((r) => r.id),
        totalCents: total,
      }),
    });

    return { updatedIds: rows.map((r) => r.id), totalCents: total };
  });

  if (updatedIds.length === 0) {
    return { ok: true };
  }

  // Items reconstruits à partir du subset effectivement mis à jour.
  const itemsById = new Map(asDebtor.map((d) => [d.id, d]));
  const items = updatedIds.flatMap((id) => {
    const row = itemsById.get(id);
    if (!row) {
      return [];
    }
    return [{ outingTitle: row.outingTitle, amountCents: row.amountCents }];
  });

  try {
    await sendBulkPaymentDeclaredEmail({
      debtorUserId: callerUserId,
      creditorUserId,
      items,
      totalCents,
    });
  } catch (err) {
    await db.insert(auditLog).values({
      outingId: null,
      actorParticipantId,
      actorUserId: callerUserId,
      action: AUDIT_ACTION.BULK_EMAIL_SEND_FAILED,
      ipHash,
      payload: JSON.stringify({
        bulkAction: AUDIT_ACTION.BULK_DEBTS_DECLARED_PAID,
        reason: err instanceof Error ? err.message : String(err),
      }),
    });
  }

  revalidatePath("/moi/argent");
  return { ok: true };
}

/**
 * Settle net (compensation bilatérale). Pour les dettes croisées entre
 * `callerUserId` et `otherUserId` :
 *   - les dettes où le caller est débiteur → `declared_paid` (déclaration)
 *   - les dettes où le caller est créditeur → `confirmed` (confirmation
 *     par compensation, audit payload `via: 'settlement'`)
 *
 * Net recalculé côté serveur à partir du résultat returning() — la
 * valeur client n'est jamais utilisée. SELECT FOR UPDATE sérialise les
 * éditions concurrentes du peer.
 */
export async function settleNetAction(input: unknown): Promise<BulkActionResult> {
  const parsed = bulkInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid" };
  }
  const session = await requireSession();
  if (!session) {
    return { ok: false, code: "unauthorized" };
  }
  const callerUserId = session.userId;
  const otherUserId = parsed.data.otherUserId;
  if (otherUserId === callerUserId) {
    return { ok: false, code: "invalid" };
  }

  const preGate = await rateLimit({
    key: `wallet-bulk-settle:${callerUserId}:${otherUserId}`,
    limit: 1,
    windowSeconds: 60,
  });
  if (!preGate.ok) {
    return { ok: false, code: "rate_limited" };
  }

  const { asDebtor, asCreditor } = await getDebtsBetweenUsers({
    callerUserId,
    otherUserId,
    statuses: ["pending", "declared_paid"],
  });

  // Reject explicite : settleNet n'a de sens que si flux dans les 2 sens.
  // Sinon l'UI doit rediriger vers markAllDebtsPaidAction ou remindAllDebtsAction.
  const hasDebtSide = asDebtor.some((d) => d.status === "pending");
  const hasCreditSide = asCreditor.some(
    (d) => d.status === "pending" || d.status === "declared_paid"
  );
  if (!hasDebtSide || !hasCreditSide) {
    return { ok: false, code: "nothing_todo" };
  }

  const ipHash = await hashIp();
  const actorParticipantId =
    asDebtor.find((d) => d.status === "pending")?.debtorParticipantId ??
    asCreditor[0]!.creditorParticipantId;

  const debtTargetIds = asDebtor.filter((d) => d.status === "pending").map((d) => d.id);
  const creditTargetIds = asCreditor
    .filter((d) => d.status === "pending" || d.status === "declared_paid")
    .map((d) => d.id);

  const result = await db.transaction(async (tx) => {
    // FOR UPDATE serialise les mutations concurrentes côté peer.
    await tx.execute(
      sql`SELECT id FROM ${debts} WHERE ${debts.id} IN (${sql.join(
        [...debtTargetIds, ...creditTargetIds].map((id) => sql`${id}`),
        sql`, `
      )}) FOR UPDATE`
    );

    const updatedDebtRows = await tx
      .update(debts)
      .set({ status: "declared_paid", declaredAt: new Date(), updatedAt: new Date() })
      .where(and(inArray(debts.id, debtTargetIds), eq(debts.status, "pending")))
      .returning({ id: debts.id, amountCents: debts.amountCents });

    const updatedCreditRows = await tx
      .update(debts)
      .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
      .where(
        and(inArray(debts.id, creditTargetIds), inArray(debts.status, ["pending", "declared_paid"]))
      )
      .returning({ id: debts.id, amountCents: debts.amountCents });

    if (updatedDebtRows.length === 0 && updatedCreditRows.length === 0) {
      return { debt: [], credit: [], net: 0, bulkAuditId: null };
    }

    const debtTotal = updatedDebtRows.reduce((s, r) => s + r.amountCents, 0);
    const creditTotal = updatedCreditRows.reduce((s, r) => s + r.amountCents, 0);
    // Net du POV du caller : positif = on lui doit globalement, négatif = il doit.
    const netForCaller = creditTotal - debtTotal;

    const [bulkAudit] = await tx
      .insert(auditLog)
      .values({
        outingId: null,
        actorParticipantId,
        actorUserId: callerUserId,
        action: AUDIT_ACTION.BULK_DEBTS_SETTLED,
        ipHash,
        payload: JSON.stringify({
          callerUserId,
          otherUserId,
          netCents: netForCaller,
          debtIdsAsDebtor: updatedDebtRows.map((r) => r.id),
          debtIdsAsCreditor: updatedCreditRows.map((r) => r.id),
        }),
      })
      .returning({ id: auditLog.id });

    const bulkAuditId = bulkAudit?.id ?? null;

    if (updatedDebtRows.length > 0) {
      await tx.insert(auditLog).values(
        updatedDebtRows.map((r) => ({
          outingId: null,
          actorParticipantId,
          actorUserId: callerUserId,
          action: AUDIT_ACTION.DEBT_DECLARED_PAID,
          ipHash,
          payload: JSON.stringify({
            debtId: r.id,
            via: "settlement",
            bulkAuditId,
          }),
        }))
      );
    }
    if (updatedCreditRows.length > 0) {
      await tx.insert(auditLog).values(
        updatedCreditRows.map((r) => ({
          outingId: null,
          actorParticipantId,
          actorUserId: callerUserId,
          action: AUDIT_ACTION.DEBT_CONFIRMED,
          ipHash,
          payload: JSON.stringify({
            debtId: r.id,
            via: "settlement",
            bulkAuditId,
            netCents: netForCaller,
          }),
        }))
      );
    }

    return { debt: updatedDebtRows, credit: updatedCreditRows, net: netForCaller, bulkAuditId };
  });

  if (result.debt.length === 0 && result.credit.length === 0) {
    return { ok: true };
  }

  const itemsById = new Map([...asDebtor, ...asCreditor].map((d) => [d.id, d]));
  // « Recipient » côté mail = l'autre user. Recipient owed = ce qu'IL nous
  // devait (les credits du caller). Recipient credited = ce qu'on lui devait.
  const itemsRecipientOwed = result.credit.flatMap((r) => {
    const row = itemsById.get(r.id);
    return row ? [{ outingTitle: row.outingTitle, amountCents: r.amountCents }] : [];
  });
  const itemsRecipientCredited = result.debt.flatMap((r) => {
    const row = itemsById.get(r.id);
    return row ? [{ outingTitle: row.outingTitle, amountCents: r.amountCents }] : [];
  });
  // Net du POV du destinataire = -net du caller.
  const netForRecipient = -result.net;

  try {
    await sendBulkSettledEmail({
      initiatorUserId: callerUserId,
      recipientUserId: otherUserId,
      netCentsForRecipient: netForRecipient,
      itemsRecipientOwed,
      itemsRecipientCredited,
    });
  } catch (err) {
    await db.insert(auditLog).values({
      outingId: null,
      actorParticipantId,
      actorUserId: callerUserId,
      action: AUDIT_ACTION.BULK_EMAIL_SEND_FAILED,
      ipHash,
      payload: JSON.stringify({
        bulkAuditId: result.bulkAuditId,
        bulkAction: AUDIT_ACTION.BULK_DEBTS_SETTLED,
        reason: err instanceof Error ? err.message : String(err),
      }),
    });
  }

  revalidatePath("/moi/argent");
  return { ok: true };
}
