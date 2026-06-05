import { describe, expect, it } from "vitest";
import { changedDebtAmounts } from "./compute-debt-rows";

describe("changedDebtAmounts", () => {
  it("renvoie les débiteurs dont le montant a augmenté", () => {
    const before = new Map([["alice", 2000]]);
    const after = new Map([["alice", 3175]]);
    expect(changedDebtAmounts(before, after)).toEqual(new Map([["alice", 3175]]));
  });

  it("inclut un nouveau débiteur (0 → montant), cas du prix corrigé depuis 0 €", () => {
    const before = new Map<string, number>();
    const after = new Map([
      ["alice", 3175],
      ["bob", 3175],
    ]);
    expect(changedDebtAmounts(before, after)).toEqual(
      new Map([
        ["alice", 3175],
        ["bob", 3175],
      ])
    );
  });

  it("exclut les montants inchangés (pas de spam)", () => {
    const before = new Map([
      ["alice", 3175],
      ["bob", 2000],
    ]);
    const after = new Map([
      ["alice", 3175],
      ["bob", 2500],
    ]);
    expect(changedDebtAmounts(before, after)).toEqual(new Map([["bob", 2500]]));
  });

  it("exclut un montant retombé à 0 (place offerte / dette annulée)", () => {
    const before = new Map([["alice", 3175]]);
    const after = new Map([["alice", 0]]);
    expect(changedDebtAmounts(before, after)).toEqual(new Map());
  });

  it("rien ne change → map vide", () => {
    const before = new Map([["alice", 3175]]);
    const after = new Map([["alice", 3175]]);
    expect(changedDebtAmounts(before, after)).toEqual(new Map());
  });
});
