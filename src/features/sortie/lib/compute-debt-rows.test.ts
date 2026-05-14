import { describe, expect, it } from "vitest";
import { computeDebtRows } from "./compute-debt-rows";

const BUYER = "buyer-id";

// Achat « catégorie » : adulte 45 €, enfant 20 €. L'acheteur règle tout.
const categoryPurchase = {
  purchaserParticipantId: BUYER,
  pricingMode: "category" as const,
  uniquePriceCents: null,
  adultPriceCents: 4500,
  childPriceCents: 2000,
};

function alloc(
  participantId: string,
  isChild: boolean,
  giftedAt: Date | null = null,
  nominalPriceCents: number | null = null
) {
  return { participantId, isChild, nominalPriceCents, giftedAt };
}

describe("computeDebtRows", () => {
  it("agrège les places d'un débiteur en une dette pending", () => {
    const rows = computeDebtRows(
      [alloc(BUYER, false), alloc("alice", false), alloc("alice", true)],
      categoryPurchase
    );
    expect(rows).toEqual([{ debtorParticipantId: "alice", amountCents: 6500, status: "pending" }]);
  });

  it("exclut l'acheteur — il n'a jamais de dette envers lui-même", () => {
    const rows = computeDebtRows([alloc(BUYER, false), alloc(BUYER, true)], categoryPurchase);
    expect(rows).toEqual([]);
  });

  it("offre partielle : la place offerte compte 0 €, la dette reste pending", () => {
    const rows = computeDebtRows(
      [alloc("alice", false), alloc("alice", true, new Date())],
      categoryPurchase
    );
    // adulte 45 € dû, enfant offert → 45 €.
    expect(rows).toEqual([{ debtorParticipantId: "alice", amountCents: 4500, status: "pending" }]);
  });

  it("offre totale : toutes les places offertes → dette gifted à 0 €", () => {
    const rows = computeDebtRows(
      [alloc("alice", false, new Date()), alloc("alice", true, new Date())],
      categoryPurchase
    );
    expect(rows).toEqual([{ debtorParticipantId: "alice", amountCents: 0, status: "gifted" }]);
  });

  it("place à 0 € non offerte → aucune dette (prévente / abo)", () => {
    const freePurchase = {
      purchaserParticipantId: BUYER,
      pricingMode: "unique" as const,
      uniquePriceCents: 0,
      adultPriceCents: null,
      childPriceCents: null,
    };
    const rows = computeDebtRows([alloc("alice", false)], freePurchase);
    expect(rows).toEqual([]);
  });

  it("ghost-buyer : l'acheteur n'a pas d'allocation, les autres doivent quand même", () => {
    const rows = computeDebtRows([alloc("alice", false), alloc("bob", true)], categoryPurchase);
    expect(rows).toEqual([
      { debtorParticipantId: "alice", amountCents: 4500, status: "pending" },
      { debtorParticipantId: "bob", amountCents: 2000, status: "pending" },
    ]);
  });
});
