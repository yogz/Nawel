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

export type AllocationPriceArgs = {
  isChild: boolean;
  pricingMode: "unique" | "category" | "nominal";
  uniquePriceCents: number | null;
  adultPriceCents: number | null;
  childPriceCents: number | null;
  nominalPriceCents: number | null;
};

/**
 * Résout le prix effectif d'une allocation selon le mode de pricing
 * de son achat parent. Renvoie `null` quand le prix n'est pas défini
 * (ex: mode `nominal` sans `nominalPriceCents` saisi) — le caller
 * décide alors d'afficher « prix non renseigné » et d'exclure du total
 * plutôt que de compter 0.
 */
export function getAllocationPriceCents(args: AllocationPriceArgs): number | null {
  switch (args.pricingMode) {
    case "unique":
      return args.uniquePriceCents;
    case "category":
      return args.isChild ? args.childPriceCents : args.adultPriceCents;
    case "nominal":
      return args.nominalPriceCents;
  }
}

export function formatAllocationLabel(args: AllocationPriceArgs): string {
  const kind = args.isChild ? "place enfant" : "place adulte";
  const cents = getAllocationPriceCents(args) ?? 0;
  return cents > 0 ? `${kind} · ${formatCents(cents)}` : kind;
}
