import { describe, it, expect } from "vitest";
import { parseQuantity, aggregateShoppingList, formatAggregatedQuantity } from "./shopping-utils";
import { type Ingredient, type Item } from "./types";

describe("Shopping Utils", () => {
  describe("parseQuantity", () => {
    it("should parse simple numbers", () => {
      expect(parseQuantity("4")).toEqual({ value: 4, unit: "" });
      expect(parseQuantity("4.5")).toEqual({ value: 4.5, unit: "" });
      expect(parseQuantity("4,5")).toEqual({ value: 4.5, unit: "" });
    });

    it("should parse numbers with units", () => {
      expect(parseQuantity("4 oeufs")).toEqual({ value: 4, unit: "oeufs" });
      expect(parseQuantity("400g")).toEqual({ value: 400, unit: "g" });
      expect(parseQuantity("1.5L")).toEqual({ value: 1.5, unit: "l" });
    });

    it("should handle strings without numbers", () => {
      expect(parseQuantity("oeufs")).toEqual({ value: null, unit: "oeufs" });
      expect(parseQuantity(null)).toEqual({ value: null, unit: "" });
    });
  });

  describe("aggregateShoppingList", () => {
    it("should aggregate items with same name and unit", () => {
      const items = [
        {
          type: "ingredient" as const,
          ingredient: { name: "oeufs", quantity: "4", checked: false } as unknown as Ingredient,
          item: { name: "Portokalopita" } as unknown as Item,
          mealTitle: "M1",
          serviceTitle: "S1",
        },
        {
          type: "ingredient" as const,
          ingredient: { name: "oeufs", quantity: "6", checked: false } as unknown as Ingredient,
          item: { name: "Flan" } as unknown as Item,
          mealTitle: "M2",
          serviceTitle: "S1",
        },
      ];

      const aggregated = aggregateShoppingList(items);
      expect(aggregated).toHaveLength(1);
      expect(aggregated[0].name).toBe("oeufs");
      expect(aggregated[0].quantity).toBe(10);
      expect(aggregated[0].unit).toBe("");
    });

    it("should not aggregate items with different units", () => {
      const items = [
        {
          type: "ingredient" as const,
          ingredient: { name: "farine", quantity: "200g", checked: false } as unknown as Ingredient,
          item: { name: "Cake" } as unknown as Item,
          mealTitle: "M1",
          serviceTitle: "S1",
        },
        {
          type: "ingredient" as const,
          ingredient: {
            name: "farine",
            quantity: "1 cup",
            checked: false,
          } as unknown as Ingredient,
          item: { name: "Pancakes" } as unknown as Item,
          mealTitle: "M2",
          serviceTitle: "S1",
        },
      ];

      const aggregated = aggregateShoppingList(items);
      expect(aggregated).toHaveLength(2);
    });

    it("should consider checked only if all sources are checked", () => {
      const items = [
        {
          type: "ingredient" as const,
          ingredient: { name: "sel", quantity: "1g", checked: true } as unknown as Ingredient,
          item: { name: "A" } as unknown as Item,
          mealTitle: "M1",
          serviceTitle: "S1",
        },
        {
          type: "ingredient" as const,
          ingredient: { name: "sel", quantity: "1g", checked: false } as unknown as Ingredient,
          item: { name: "B" } as unknown as Item,
          mealTitle: "M1",
          serviceTitle: "S1",
        },
      ];

      const aggregated = aggregateShoppingList(items);
      expect(aggregated[0].checked).toBe(false);

      (items[1].ingredient as unknown as Ingredient).checked = true;
      const aggregated2 = aggregateShoppingList(items);
      expect(aggregated2[0].checked).toBe(true);
    });
  });

  describe("formatAggregatedQuantity", () => {
    it("should format quantities correctly", () => {
      expect(formatAggregatedQuantity(10, "oeufs")).toBe("10 oeufs");
      expect(formatAggregatedQuantity(400, "g")).toBe("400g");
      expect(formatAggregatedQuantity(1.5, "l")).toBe("1.5l");
      expect(formatAggregatedQuantity(null, "oeufs")).toBe("oeufs");
    });
  });
});
