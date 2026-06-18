import { describe, it, expect } from "vitest";
import {
  computeAssessmentInputHash,
  type AssessmentHashMeal,
  type AssessmentHashItem,
} from "./meal-assessment-hash";

function meal(overrides: Partial<AssessmentHashMeal> = {}): AssessmentHashMeal {
  return {
    title: "BBQ",
    adults: 8,
    children: 2,
    services: [
      {
        id: 1,
        title: "Viande",
        items: [
          { id: 10, name: "Saucisses", quantity: "5", personId: 1, serviceId: 1 },
          { id: 11, name: "Merguez", quantity: "3", personId: 2, serviceId: 1 },
        ],
      },
    ],
    ...overrides,
  };
}

describe("computeAssessmentInputHash", () => {
  it("is stable across reordering of services and items", () => {
    const base = meal();
    const reordered = meal({
      services: [
        {
          id: 1,
          title: "Viande",
          items: [
            { id: 11, name: "Merguez", quantity: "3", personId: 2, serviceId: 1 },
            { id: 10, name: "Saucisses", quantity: "5", personId: 1, serviceId: 1 },
          ],
        },
      ],
    });
    expect(computeAssessmentInputHash(reordered)).toBe(computeAssessmentInputHash(base));
  });

  it("changes when a quantity changes", () => {
    const base = meal();
    const changed = meal({
      services: [
        {
          id: 1,
          title: "Viande",
          items: [
            { id: 10, name: "Saucisses", quantity: "12", personId: 1, serviceId: 1 },
            { id: 11, name: "Merguez", quantity: "3", personId: 2, serviceId: 1 },
          ],
        },
      ],
    });
    expect(computeAssessmentInputHash(changed)).not.toBe(computeAssessmentInputHash(base));
  });

  it("changes when an item is assigned/unassigned (personId presence)", () => {
    const base = meal();
    const unassigned = meal({
      services: [
        {
          id: 1,
          title: "Viande",
          items: [
            { id: 10, name: "Saucisses", quantity: "5", personId: null, serviceId: 1 },
            { id: 11, name: "Merguez", quantity: "3", personId: 2, serviceId: 1 },
          ],
        },
      ],
    });
    expect(computeAssessmentInputHash(unassigned)).not.toBe(computeAssessmentInputHash(base));
  });

  it("changes when adults/children counts change", () => {
    expect(computeAssessmentInputHash(meal({ adults: 10 }))).not.toBe(
      computeAssessmentInputHash(meal())
    );
    expect(computeAssessmentInputHash(meal({ children: 0 }))).not.toBe(
      computeAssessmentInputHash(meal())
    );
  });

  it("ignores fields that don't affect the assessment (checked, price, order)", () => {
    const base = meal();
    // Build items carrying extra runtime fields via spread (identifiers bypass
    // excess-property checks) to prove they are not folded into the hash.
    const noisyItems: AssessmentHashItem[] = base.services[0].items.map((item) => ({
      ...item,
      checked: true,
      price: 9.99,
      order: 999,
    }));
    const noisy = meal({
      services: [{ id: 1, title: "Viande", items: noisyItems }],
    });
    expect(computeAssessmentInputHash(noisy)).toBe(computeAssessmentInputHash(base));
  });
});
