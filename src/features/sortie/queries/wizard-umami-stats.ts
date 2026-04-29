import {
  computePercentiles,
  getConfirmEnteredCount,
  getGeminiTriggerBreakdown,
  getPasteKindBreakdown,
  getPasteToPublishDistribution,
  getWizardFunnelCounts,
  isUmamiConfigured,
  lastNDaysRange,
  type WizardFunnelStep,
} from "@/features/sortie/lib/umami-api";

export type GeminiTriggerCounts = {
  auto: number;
  optin: number;
  bg: number;
  unknown: number;
  total: number;
};

export type PasteToPublishStats = {
  count: number;
  median: number;
  p90: number;
};

export type PasteKindBreakdown = {
  url: number;
  text: number;
  total: number;
};

export type WizardUmamiStats = {
  configured: boolean;
  rangeDays: number;
  funnel: WizardFunnelStep[] | null;
  pasteToPublish: PasteToPublishStats | null;
  geminiTriggers: GeminiTriggerCounts | null;
  pasteKind: PasteKindBreakdown | null;
  confirmEntered: number | null;
};

/**
 * Façade unique pour la page /sortie/stat. Lance les 3 calls Umami
 * en parallèle, transforme les réponses en formes prêtes à rendre,
 * et expose `configured` pour que le composant puisse afficher un
 * fallback "configure UMAMI_API_KEY" plutôt qu'un état vide trompeur.
 */
export async function getWizardUmamiStats(rangeDays = 7): Promise<WizardUmamiStats> {
  const configured = isUmamiConfigured();
  if (!configured) {
    return {
      configured: false,
      rangeDays,
      funnel: null,
      pasteToPublish: null,
      geminiTriggers: null,
      pasteKind: null,
      confirmEntered: null,
    };
  }
  const range = lastNDaysRange(rangeDays);
  const [funnel, distribution, triggers, pasteKindRows, confirmEntered] = await Promise.all([
    getWizardFunnelCounts(range),
    getPasteToPublishDistribution(range),
    getGeminiTriggerBreakdown(range),
    getPasteKindBreakdown(range),
    getConfirmEnteredCount(range),
  ]);

  const pasteToPublish = distribution ? computePercentiles(distribution) : null;

  let geminiTriggers: GeminiTriggerCounts | null = null;
  if (triggers) {
    const counts: GeminiTriggerCounts = { auto: 0, optin: 0, bg: 0, unknown: 0, total: 0 };
    for (const row of triggers) {
      if (row.value === "auto" || row.value === "optin" || row.value === "bg") {
        counts[row.value] += row.total;
      } else {
        counts.unknown += row.total;
      }
      counts.total += row.total;
    }
    geminiTriggers = counts;
  }

  let pasteKind: PasteKindBreakdown | null = null;
  if (pasteKindRows) {
    const breakdown: PasteKindBreakdown = { url: 0, text: 0, total: 0 };
    for (const row of pasteKindRows) {
      if (row.value === "url" || row.value === "text") {
        breakdown[row.value] += row.total;
      }
      breakdown.total += row.total;
    }
    pasteKind = breakdown;
  }

  return {
    configured,
    rangeDays,
    funnel,
    pasteToPublish,
    geminiTriggers,
    pasteKind,
    confirmEntered,
  };
}
