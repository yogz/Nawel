"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  auditLog,
  debts,
  outings,
  participants,
  purchaseAllocations,
  purchases,
  type debtStatus as debtStatusEnum,
} from "@drizzle/sortie-schema";
import { assertSortieAdmin } from "@/features/sortie/lib/require-sortie-admin";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { priceFor } from "@/features/sortie/lib/price-for";
import type { FormActionState } from "./outing-actions";
import { formDataToObject } from "@/features/sortie/lib/form-data";

// AuditLog action labels for admin overrides. Garder en string union pour
// que les recherches `WHERE action = '…'` restent stables si un constant
// est renommé côté code.
const ADMIN_AUDIT = {
  PURCHASE_ADMIN_PURCHASER_SWAPPED: "PURCHASE_ADMIN_PURCHASER_SWAPPED",
  DEBT_ADMIN_STATUS_OVERRIDE: "DEBT_ADMIN_STATUS_OVERRIDE",
  DEBT_ADMIN_AMOUNT_UPDATED: "DEBT_ADMIN_AMOUNT_UPDATED",
  DEBT_ADMIN_DELETED: "DEBT_ADMIN_DELETED",
} as const;

const MAX_DEBT_CENTS = 100_000_00;

const swapPurchaserSchema = z.object({
  shortId: z.string().min(1),
  newPurchaserParticipantId: z.string().uuid(),
});

const setDebtStatusSchema = z.object({
  debtId: z.string().uuid(),
  status: z.enum(["pending", "declared_paid", "confirmed"]),
});
type DebtStatusValue = (typeof debtStatusEnum.enumValues)[number];

const updateDebtAmountSchema = z.object({
  debtId: z.string().uuid(),
  amountCents: z.coerce.number().int().min(1).max(MAX_DEBT_CENTS),
});

const deleteDebtSchema = z.object({
  debtId: z.string().uuid(),
});

async function revalidateForOuting(outing: { slug: string | null; shortId: string }) {
  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath("/admin/dettes");
  revalidatePath(`/admin/dettes/${outing.shortId}`);
  revalidatePath(`/${canonical}/dettes`);
}

/**
 * Bascule le payeur d'un achat. Réplique exactement le script
 * scripts/db/swap-purchaser.ts mais avec les garanties admin (audit log,
 * revalidation, garde non-pending).
 */
export async function swapPurchaserAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await assertSortieAdmin();
  const parsed = swapPurchaserSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { shortId, newPurchaserParticipantId } = parsed.data;

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
    columns: { id: true, shortId: true, slug: true },
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.outingId, outing.id),
  });
  if (!purchase) {
    return { message: "Aucun achat enregistré sur cette sortie." };
  }

  if (purchase.purchaserParticipantId === newPurchaserParticipantId) {
    return { message: "Cette personne est déjà le payeur." };
  }

  const newBuyer = await db.query.participants.findFirst({
    where: eq(participants.id, newPurchaserParticipantId),
    columns: { id: true, outingId: true },
  });
  if (!newBuyer || newBuyer.outingId !== outing.id) {
    return { message: "Participant invalide." };
  }

  const allocs = await db.query.purchaseAllocations.findMany({
    where: eq(purchaseAllocations.purchaseId, purchase.id),
  });
  if (!allocs.some((a) => a.participantId === newPurchaserParticipantId)) {
    return {
      message:
        "Le nouveau payeur n'a pas d'allocation sur cet achat. Réinitialise les allocations d'abord.",
    };
  }

  const allDebts = await db.query.debts.findMany({
    where: eq(debts.outingId, outing.id),
  });
  if (allDebts.some((d) => d.status !== "pending")) {
    return {
      message:
        "Une ou plusieurs dettes ne sont plus en 'pending'. Réinitialise les statuts avant de basculer le payeur.",
    };
  }

  // Recompute des dettes pour le nouveau payeur via le helper partagé.
  const debtsByDebtor = new Map<string, number>();
  for (const a of allocs) {
    if (a.participantId === newPurchaserParticipantId) {
      continue;
    }
    const amount = priceFor(purchase, a);
    debtsByDebtor.set(a.participantId, (debtsByDebtor.get(a.participantId) ?? 0) + amount);
  }
  const newDebtRows = Array.from(debtsByDebtor.entries())
    .filter(([, amount]) => amount > 0)
    .map(([participantId, amount]) => ({
      outingId: outing.id,
      debtorParticipantId: participantId,
      creditorParticipantId: newPurchaserParticipantId,
      amountCents: amount,
    }));

  const before = {
    purchaseId: purchase.id,
    purchaserParticipantId: purchase.purchaserParticipantId,
    debts: allDebts.map((d) => ({
      id: d.id,
      debtorParticipantId: d.debtorParticipantId,
      creditorParticipantId: d.creditorParticipantId,
      amountCents: d.amountCents,
    })),
  };

  await db.transaction(async (tx) => {
    await tx.delete(debts).where(eq(debts.outingId, outing.id));
    await tx
      .update(purchases)
      .set({ purchaserParticipantId: newPurchaserParticipantId })
      .where(eq(purchases.id, purchase.id));
    if (newDebtRows.length > 0) {
      await tx.insert(debts).values(newDebtRows);
    }
    await tx.insert(auditLog).values({
      outingId: outing.id,
      actorUserId: session.user.id,
      action: ADMIN_AUDIT.PURCHASE_ADMIN_PURCHASER_SWAPPED,
      payload: JSON.stringify({
        before,
        after: {
          purchaserParticipantId: newPurchaserParticipantId,
          debts: newDebtRows,
        },
      }),
    });
  });

  await revalidateForOuting(outing);
  return {};
}

/**
 * Force le status d'une dette (override admin). Met à jour les timestamps
 * declaredAt/confirmedAt en cohérence avec la transition.
 */
export async function setDebtStatusAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await assertSortieAdmin();
  const parsed = setDebtStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { debtId, status } = parsed.data;

  const debt = await db.query.debts.findFirst({
    where: eq(debts.id, debtId),
  });
  if (!debt) {
    return { message: "Dette introuvable." };
  }

  if (debt.status === status) {
    return {};
  }

  const outing = await db.query.outings.findFirst({
    where: eq(outings.id, debt.outingId),
    columns: { id: true, shortId: true, slug: true },
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  const now = new Date();
  // Map status → timestamp slots. Reculer (ex: confirmed → pending) doit
  // nullifier les colonnes pour que la sortie reflète vraiment le retour
  // à zéro et pas un état hybride.
  const updates: {
    status: DebtStatusValue;
    updatedAt: Date;
    declaredAt: Date | null;
    confirmedAt: Date | null;
  } = {
    status,
    updatedAt: now,
    declaredAt: debt.declaredAt,
    confirmedAt: debt.confirmedAt,
  };
  if (status === "pending") {
    updates.declaredAt = null;
    updates.confirmedAt = null;
  } else if (status === "declared_paid") {
    updates.declaredAt = debt.declaredAt ?? now;
    updates.confirmedAt = null;
  } else if (status === "confirmed") {
    updates.declaredAt = debt.declaredAt ?? now;
    updates.confirmedAt = debt.confirmedAt ?? now;
  }

  await db.transaction(async (tx) => {
    await tx.update(debts).set(updates).where(eq(debts.id, debtId));
    await tx.insert(auditLog).values({
      outingId: outing.id,
      actorUserId: session.user.id,
      action: ADMIN_AUDIT.DEBT_ADMIN_STATUS_OVERRIDE,
      payload: JSON.stringify({
        debtId,
        before: {
          status: debt.status,
          declaredAt: debt.declaredAt,
          confirmedAt: debt.confirmedAt,
        },
        after: {
          status: updates.status,
          declaredAt: updates.declaredAt,
          confirmedAt: updates.confirmedAt,
        },
      }),
    });
  });

  await revalidateForOuting(outing);
  return {};
}

/**
 * Édition admin du montant d'une dette. Touche uniquement amountCents,
 * pas les allocations — désync possible que l'UI doit signaler.
 */
export async function updateDebtAmountAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await assertSortieAdmin();
  const parsed = updateDebtAmountSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { debtId, amountCents } = parsed.data;

  const debt = await db.query.debts.findFirst({
    where: eq(debts.id, debtId),
  });
  if (!debt) {
    return { message: "Dette introuvable." };
  }

  if (debt.amountCents === amountCents) {
    return {};
  }

  const outing = await db.query.outings.findFirst({
    where: eq(outings.id, debt.outingId),
    columns: { id: true, shortId: true, slug: true },
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  await db.transaction(async (tx) => {
    await tx.update(debts).set({ amountCents, updatedAt: new Date() }).where(eq(debts.id, debtId));
    await tx.insert(auditLog).values({
      outingId: outing.id,
      actorUserId: session.user.id,
      action: ADMIN_AUDIT.DEBT_ADMIN_AMOUNT_UPDATED,
      payload: JSON.stringify({
        debtId,
        before: { amountCents: debt.amountCents },
        after: { amountCents },
      }),
    });
  });

  await revalidateForOuting(outing);
  return {};
}

/**
 * Supprime une dette (irréversible). La row complète est sérialisée dans
 * audit_log.payload pour permettre une restauration manuelle si besoin.
 */
export async function deleteDebtAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await assertSortieAdmin();
  const parsed = deleteDebtSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { debtId } = parsed.data;

  const debt = await db.query.debts.findFirst({
    where: eq(debts.id, debtId),
  });
  if (!debt) {
    return { message: "Dette introuvable." };
  }

  const outing = await db.query.outings.findFirst({
    where: eq(outings.id, debt.outingId),
    columns: { id: true, shortId: true, slug: true },
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  await db.transaction(async (tx) => {
    await tx.delete(debts).where(eq(debts.id, debtId));
    await tx.insert(auditLog).values({
      outingId: outing.id,
      actorUserId: session.user.id,
      action: ADMIN_AUDIT.DEBT_ADMIN_DELETED,
      payload: JSON.stringify({
        debtId,
        deletedRow: {
          debtorParticipantId: debt.debtorParticipantId,
          creditorParticipantId: debt.creditorParticipantId,
          amountCents: debt.amountCents,
          status: debt.status,
          declaredAt: debt.declaredAt,
          confirmedAt: debt.confirmedAt,
          createdAt: debt.createdAt,
        },
      }),
    });
  });

  await revalidateForOuting(outing);
  return {};
}
