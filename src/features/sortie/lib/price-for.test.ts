import { describe, expect, it } from "vitest";
import { priceFor } from "./price-for";

describe("priceFor", () => {
  it("renvoie le prix unique en mode 'unique'", () => {
    const purchase = {
      pricingMode: "unique" as const,
      uniquePriceCents: 3200,
      adultPriceCents: null,
      childPriceCents: null,
    };
    expect(priceFor(purchase, { isChild: false, nominalPriceCents: null })).toBe(3200);
    expect(priceFor(purchase, { isChild: true, nominalPriceCents: null })).toBe(3200);
  });

  it("distingue adulte / enfant en mode 'category'", () => {
    const purchase = {
      pricingMode: "category" as const,
      uniquePriceCents: null,
      adultPriceCents: 4500,
      childPriceCents: 2000,
    };
    expect(priceFor(purchase, { isChild: false, nominalPriceCents: null })).toBe(4500);
    expect(priceFor(purchase, { isChild: true, nominalPriceCents: null })).toBe(2000);
  });

  it("lit le prix nominal de l'allocation en mode 'nominal'", () => {
    const purchase = {
      pricingMode: "nominal" as const,
      uniquePriceCents: null,
      adultPriceCents: null,
      childPriceCents: null,
    };
    expect(priceFor(purchase, { isChild: false, nominalPriceCents: 1800 })).toBe(1800);
    expect(priceFor(purchase, { isChild: true, nominalPriceCents: 900 })).toBe(900);
  });

  it("renvoie 0 si une colonne attendue est null (purchase mal saisi)", () => {
    expect(
      priceFor(
        {
          pricingMode: "unique" as const,
          uniquePriceCents: null,
          adultPriceCents: null,
          childPriceCents: null,
        },
        { isChild: false, nominalPriceCents: null }
      )
    ).toBe(0);
  });
});
