import { and, eq } from "drizzle-orm";
import type { db } from "@/lib/db";
import { debts, purchaseAllocations } from "@drizzle/sortie-schema";
import { priceFor } from "@/features/sortie/lib/price-for";
import type { DebtStatusValue } from "@/features/sortie/queries/debt-queries";

/**
 * `true` si le statut bloque le recalcul du ledger : un paiement en cours
 * (`declared_paid`/`confirmed`) interdit de renuméroter les dettes. `pending` et
 * `gifted` (terminal sans paiement) ne bloquent pas. Prédicat partagé par les
 * pages, `swapPurchaserAction` et `recomputeDebtsForPurchase`.
 */
export function isLedgerLockingStatus(status: DebtStatusValue): boolean {
  return status === "declared_paid" || status === "confirmed";
}

/**
 * Recalcul des dettes d'un achat — source de vérité unique, gift-aware.
 *
 * `gifted` vit à deux endroits : `purchase_allocations.gifted_at` (l'allocation
 * offerte) et `debts.status` (la dette dérivée). Les trois chemins qui
 * recalculent les dettes — cession, swap purchaser, et l'offre de place —
 * DOIVENT passer par ce module, sinon ils « dé-offrent » silencieusement à la
 * prochaine exécution (une allocation `gifted_at` non-null recompterait à plein
 * tarif).
 */

type AllocationInput = {
  participantId: string;
  isChild: boolean;
  nominalPriceCents: number | null;
  giftedAt: Date | null;
};

type PurchaseShape = {
  purchaserParticipantId: string;
  pricingMode: "unique" | "category" | "nominal";
  uniquePriceCents: number | null;
  adultPriceCents: number | null;
  childPriceCents: number | null;
};

export type ComputedDebtRow = {
  debtorParticipantId: string;
  amountCents: number;
  status: "pending" | "gifted";
};

/**
 * Agrège les allocations d'un achat en une dette par débiteur.
 *
 *  - allocation `giftedAt` non-null  → compte 0 €
 *  - somme > 0                       → dette `pending`
 *  - somme == 0 ET ≥1 place offerte  → dette `gifted` (0 €, état terminal)
 *  - somme == 0 sans place offerte   → aucune dette (places gratuites :
 *                                      prévente / abo / cadeau global)
 *
 * Fonction pure — testée en isolation et réutilisée par `swapPurchaserAction`
 * (qui gère son propre delete/insert car le créancier change).
 */
export function computeDebtRows(
  allocations: AllocationInput[],
  purchase: PurchaseShape
): ComputedDebtRow[] {
  const byDebtor = new Map<string, { amount: number; giftedCount: number }>();
  for (const a of allocations) {
    // L'acheteur a payé l'intégralité : il n'a jamais de dette envers lui-même.
    if (a.participantId === purchase.purchaserParticipantId) {
      continue;
    }
    const slot = byDebtor.get(a.participantId) ?? { amount: 0, giftedCount: 0 };
    if (a.giftedAt) {
      slot.giftedCount += 1;
    } else {
      slot.amount += priceFor(purchase, a);
    }
    byDebtor.set(a.participantId, slot);
  }

  const rows: ComputedDebtRow[] = [];
  for (const [debtorParticipantId, { amount, giftedCount }] of byDebtor) {
    if (amount > 0) {
      rows.push({ debtorParticipantId, amountCents: amount, status: "pending" });
    } else if (giftedCount > 0) {
      rows.push({ debtorParticipantId, amountCents: 0, status: "gifted" });
    }
  }
  return rows;
}

/**
 * Compare deux états de dettes (avant → après un recalcul) et renvoie, par
 * débiteur, le nouveau montant — uniquement pour ceux dont le montant a changé
 * ET reste strictement positif. Sert à n'envoyer la notification d'édition de
 * prix qu'aux personnes réellement impactées (pas de spam aux montants
 * inchangés, ni aux dettes retombées à 0 / offertes).
 */
export function changedDebtAmounts(
  before: Map<string, number>,
  after: Map<string, number>
): Map<string, number> {
  const out = new Map<string, number>();
  for (const [debtor, amount] of after) {
    if (amount > 0 && (before.get(debtor) ?? 0) !== amount) {
      out.set(debtor, amount);
    }
  }
  return out;
}

/**
 * Levée par `recomputeDebtsForPurchase` quand une dette de la sortie a déjà
 * dépassé `pending` (≠ `gifted`). Les actions appelantes la catchent et
 * renvoient un `FormActionState` avec message — on refuse de renuméroter un
 * ledger dont une partie a commencé à être réglée.
 */
export class DebtLockError extends Error {
  constructor() {
    super("Des paiements ont déjà été déclarés — l'opération est bloquée.");
    this.name = "DebtLockError";
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type RecomputePurchase = PurchaseShape & {
  id: string;
  outingId: string;
};

/**
 * Re-dérive les dettes d'un achat depuis ses allocations, dans une transaction.
 *
 *  1. `SELECT ... FOR UPDATE` sur les dettes de la sortie — verrouille les rows
 *     pour qu'un `markDebtPaid`/`confirmDebtPaid` concurrent ne se glisse pas
 *     entre le check et le delete (sinon une déclaration de paiement serait
 *     effacée sans trace).
 *  2. si une dette est `declared_paid`/`confirmed` → `DebtLockError`. `pending`
 *     ET `gifted` sont tolérés (offrir une place ne doit pas geler la sortie).
 *  3. delete des dettes scopées (outing + ce créancier) puis ré-insert.
 *
 * Retourne les rows calculées (utilisé pour les emails côté appelant).
 */
export async function recomputeDebtsForPurchase(
  tx: Tx,
  purchase: RecomputePurchase
): Promise<ComputedDebtRow[]> {
  const locked = await tx
    .select({ status: debts.status })
    .from(debts)
    .where(eq(debts.outingId, purchase.outingId))
    .for("update");
  if (locked.some((d) => isLedgerLockingStatus(d.status))) {
    throw new DebtLockError();
  }

  const allocs = await tx
    .select({
      participantId: purchaseAllocations.participantId,
      isChild: purchaseAllocations.isChild,
      nominalPriceCents: purchaseAllocations.nominalPriceCents,
      giftedAt: purchaseAllocations.giftedAt,
    })
    .from(purchaseAllocations)
    .where(eq(purchaseAllocations.purchaseId, purchase.id));

  const rows = computeDebtRows(allocs, purchase);

  await tx
    .delete(debts)
    .where(
      and(
        eq(debts.outingId, purchase.outingId),
        eq(debts.creditorParticipantId, purchase.purchaserParticipantId)
      )
    );
  if (rows.length > 0) {
    await tx.insert(debts).values(
      rows.map((r) => ({
        outingId: purchase.outingId,
        debtorParticipantId: r.debtorParticipantId,
        creditorParticipantId: purchase.purchaserParticipantId,
        amountCents: r.amountCents,
        status: r.status,
      }))
    );
  }
  return rows;
}
