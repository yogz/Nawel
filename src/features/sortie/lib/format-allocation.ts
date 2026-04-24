/**
 * Pure formatters shared between the server-rendered Dettes page and the
 * client-side CessionForm. Extracted into its own module so the server
 * can import `formatAllocationLabel` without dragging CessionForm's
 * `"use client"` boundary along — Next.js refuses to call a client
 * export from a server component, even when the export is a pure fn.
 */

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function formatAllocationLabel(args: {
  isChild: boolean;
  pricingMode: "unique" | "category" | "nominal";
  uniquePriceCents: number | null;
  adultPriceCents: number | null;
  childPriceCents: number | null;
  nominalPriceCents: number | null;
}): string {
  const kind = args.isChild ? "place enfant" : "place adulte";
  let cents = 0;
  switch (args.pricingMode) {
    case "unique":
      cents = args.uniquePriceCents ?? 0;
      break;
    case "category":
      cents = (args.isChild ? args.childPriceCents : args.adultPriceCents) ?? 0;
      break;
    case "nominal":
      cents = args.nominalPriceCents ?? 0;
      break;
  }
  return cents > 0 ? `${kind} · ${formatCents(cents)}` : kind;
}
