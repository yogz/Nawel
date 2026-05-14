"use server";

import { and, eq, isNotNull, isNull } from "drizzle-orm";
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
import { ADMIN_AUDIT } from "@/features/sortie/lib/admin-audit-actions";
import { assertSortieAdmin } from "@/features/sortie/lib/require-sortie-admin";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { priceFor } from "@/features/sortie/lib/price-for";
import {
  computeDebtRows,
  DebtLockError,
  isLedgerLockingStatus,
  recomputeDebtsForPurchase,
} from "@/features/sortie/lib/compute-debt-rows";
import type { FormActionState } from "./outing-actions";
import { formDataToObject } from "@/features/sortie/lib/form-data";

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

// Le formulaire poste un montant en euros (UX) ; on convertit en centimes
// avant insertion (DB). `.transform` centralise la règle d'arrondi.
const updateDebtAmountSchema = z.object({
  debtId: z.string().uuid(),
  amountEuros: z.coerce
    .number()
    .positive()
    .max(MAX_DEBT_CENTS / 100)
    .transform((v) => Math.round(v * 100)),
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

// Charge en un round-trip la dette + l'outing parente (slug/shortId pour
// la revalidation). Évite les 2 SELECTs séquentiels que faisaient toutes
// les actions par-debt.
async function loadDebtAndOuting(debtId: string) {
  const [row] = await db
    .select({
      debt: debts,
      outing: { id: outings.id, shortId: outings.shortId, slug: outings.slug },
    })
    .from(debts)
    .innerJoin(outings, eq(debts.outingId, outings.id))
    .where(eq(debts.id, debtId))
    .limit(1);
  return row ?? null;
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

  const [newBuyer, allocs, allDebts] = await Promise.all([
    db.query.participants.findFirst({
      where: eq(participants.id, newPurchaserParticipantId),
      columns: { id: true, outingId: true },
    }),
    db.query.purchaseAllocations.findMany({
      where: eq(purchaseAllocations.purchaseId, purchase.id),
    }),
    db.query.debts.findMany({
      where: eq(debts.outingId, outing.id),
    }),
  ]);

  if (!newBuyer || newBuyer.outingId !== outing.id) {
    return { message: "Participant invalide." };
  }
  if (!allocs.some((a) => a.participantId === newPurchaserParticipantId)) {
    return {
      message:
        "Le nouveau payeur n'a pas d'allocation sur cet achat. Réinitialise les allocations d'abord.",
    };
  }
  // `gifted` est toléré : c'est un état terminal sans paiement, le recalcul
  // le re-dérive proprement. Seuls `declared_paid`/`confirmed` bloquent.
  if (allDebts.some((d) => isLedgerLockingStatus(d.status))) {
    return {
      message:
        "Une ou plusieurs dettes sont en cours de règlement. Réinitialise les statuts avant de basculer le payeur.",
    };
  }

  // Recompute des dettes pour le nouveau payeur via le helper pur partagé —
  // gift-aware (une allocation `giftedAt` compte 0 €, dette `gifted` dérivée).
  const newDebtRows = computeDebtRows(allocs, {
    ...purchase,
    purchaserParticipantId: newPurchaserParticipantId,
  }).map((r) => ({
    outingId: outing.id,
    debtorParticipantId: r.debtorParticipantId,
    creditorParticipantId: newPurchaserParticipantId,
    amountCents: r.amountCents,
    status: r.status,
  }));

  const before = {
    purchaseId: purchase.id,
    purchaserParticipantId: purchase.purchaserParticipantId,
    debts: allDebts.map((d) => ({
      id: d.id,
      debtorParticipantId: d.debtorParticipantId,
      creditorParticipantId: d.creditorParticipantId,
      amountCents: d.amountCents,
      status: d.status,
    })),
    // État des places offertes : le nouveau payeur « hérite » des cadeaux de
    // l'ancien — on garde la trace pour pouvoir auditer/reconstituer.
    allocations: allocs.map((a) => ({
      id: a.id,
      participantId: a.participantId,
      giftedAt: a.giftedAt,
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

  const loaded = await loadDebtAndOuting(debtId);
  if (!loaded) {
    return { message: "Dette introuvable." };
  }
  const { debt, outing } = loaded;
  if (debt.status === status) {
    return {};
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
  // amountEuros est transformé en centimes par le schéma (cf. .transform).
  const { debtId, amountEuros: amountCents } = parsed.data;

  const loaded = await loadDebtAndOuting(debtId);
  if (!loaded) {
    return { message: "Dette introuvable." };
  }
  const { debt, outing } = loaded;
  if (debt.amountCents === amountCents) {
    return {};
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

  const loaded = await loadDebtAndOuting(debtId);
  if (!loaded) {
    return { message: "Dette introuvable." };
  }
  const { debt, outing } = loaded;

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

const allocationGiftSchema = z.object({
  allocationId: z.string().uuid(),
});

// Allocation + achat + sortie parente en un seul round-trip (relations nested).
async function loadAllocationContext(allocationId: string) {
  const allocation = await db.query.purchaseAllocations.findFirst({
    where: eq(purchaseAllocations.id, allocationId),
    with: {
      purchase: {
        with: { outing: { columns: { id: true, shortId: true, slug: true } } },
      },
    },
  });
  if (!allocation) {
    return null;
  }
  return { allocation, purchase: allocation.purchase, outing: allocation.purchase.outing };
}

/**
 * Cœur partagé de l'offre/annulation admin d'une place. C'est la voie par
 * laquelle l'admin « édite » le statut `gifted` : passer par le recalcul garde
 * l'invariant `gifted ⇒ 0 €` et la cohérence allocation↔dette (un override brut
 * du `debts.status` ne le ferait pas).
 */
async function applyAdminAllocationGift(
  formData: FormData,
  gifting: boolean
): Promise<FormActionState> {
  const session = await assertSortieAdmin();
  const parsed = allocationGiftSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const ctx = await loadAllocationContext(parsed.data.allocationId);
  if (!ctx) {
    return { message: "Place introuvable." };
  }
  const { allocation, purchase, outing } = ctx;
  if (gifting && allocation.participantId === purchase.purchaserParticipantId) {
    return { message: "L'acheteur n'a pas de dette — rien à offrir." };
  }

  // Montant concerné capturé avant l'update — pour l'audit.
  const amountCents = priceFor(purchase, allocation);
  // Guard d'idempotence dans le `WHERE` : un double-clic ne bascule qu'une fois.
  const idempotencyGuard = gifting
    ? isNull(purchaseAllocations.giftedAt)
    : isNotNull(purchaseAllocations.giftedAt);

  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .update(purchaseAllocations)
        .set({ giftedAt: gifting ? new Date() : null })
        .where(and(eq(purchaseAllocations.id, allocation.id), idempotencyGuard))
        .returning({ id: purchaseAllocations.id });
      if (!row) {
        return;
      }
      await recomputeDebtsForPurchase(tx, purchase);
      await tx.insert(auditLog).values({
        outingId: outing.id,
        actorUserId: session.user.id,
        action: gifting
          ? ADMIN_AUDIT.ALLOCATION_ADMIN_GIFTED
          : ADMIN_AUDIT.ALLOCATION_ADMIN_GIFT_REVERSED,
        payload: JSON.stringify({
          allocationId: allocation.id,
          beneficiaryParticipantId: allocation.participantId,
          purchaseId: purchase.id,
          amountCents,
        }),
      });
    });
  } catch (e) {
    if (e instanceof DebtLockError) {
      return { message: e.message };
    }
    throw e;
  }

  await revalidateForOuting(outing);
  return {};
}

/** Offre admin d'une place — pendant de `giftAllocationAction` côté acheteur. */
export async function adminGiftAllocationAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  return applyAdminAllocationGift(formData, true);
}

/**
 * Annule l'offre d'une place — seule voie de retour arrière (le créancier ne
 * peut pas « dé-offrir » lui-même, décision produit).
 */
export async function adminUngiftAllocationAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  return applyAdminAllocationGift(formData, false);
}
