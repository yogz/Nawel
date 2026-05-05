import type { purchases, purchaseAllocations } from "@drizzle/sortie-schema";

type Purchase = Pick<
  typeof purchases.$inferSelect,
  "pricingMode" | "uniquePriceCents" | "adultPriceCents" | "childPriceCents"
>;

type Allocation = Pick<typeof purchaseAllocations.$inferSelect, "isChild" | "nominalPriceCents">;

/**
 * Resolve the per-seat price for an allocation given its parent purchase.
 * Single source of truth — used at purchase time to seed debts, by the
 * admin debt console to recompute on swap, and by any backfill script.
 */
export function priceFor(purchase: Purchase, allocation: Allocation): number {
  switch (purchase.pricingMode) {
    case "unique":
      return purchase.uniquePriceCents ?? 0;
    case "category":
      return (allocation.isChild ? purchase.childPriceCents : purchase.adultPriceCents) ?? 0;
    case "nominal":
      return allocation.nominalPriceCents ?? 0;
    default: {
      const _exhaustive: never = purchase.pricingMode;
      void _exhaustive;
      return 0;
    }
  }
}
