import {
  computePercentiles,
  getActiveVisitors,
  getEventCounts,
  getGeminiTriggerBreakdown,
  getPasteKindBreakdown,
  getPasteToPublishBuckets,
  getPasteToPublishDistribution,
  getRsvpResponseBreakdown,
  getShareChannelBreakdown,
  getTopMetric,
  getWebsiteStats,
  isUmamiConfigured,
  lastNDaysRange,
  type MetricRow,
  type WebsiteStats,
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

export type PasteToPublishBuckets = {
  lt5s: number;
  s5to15: number;
  s15to60: number;
  gt60s: number;
  total: number;
};

export type PasteKindBreakdown = {
  url: number;
  text: number;
  total: number;
};

export type ShareChannelBreakdown = {
  whatsapp: number;
  native: number;
  copy: number;
  other: number;
  total: number;
};

export type RsvpBreakdown = {
  yes: number;
  no: number;
  handleOwn: number;
  total: number;
};

export type OutingPageFunnel = {
  // Vues totales sur les pages /sortie/[slug]. Mesure la portée des
  // liens partagés (un share qui ne ramène personne = lien mort).
  views: number;
  // Vues qui donnent un RSVP (any response). Indicateur de qualité de
  // la page : un visiteur arrive et agit, ou rebondit.
  rsvps: number;
  // Conversion de la sheet RSVP : ouverture → submit. Quand bas → la
  // sheet pose un problème (champ obligatoire confus, friction email).
  shares: number;
};

export type WizardUmamiStats = {
  configured: boolean;
  rangeDays: number;
  // Synthèse globale du site (visiteurs/pageviews/visits) avec
  // comparaison automatique sur la période précédente — fournie par
  // `/stats` directement, pas de 2ᵉ call.
  siteStats: WebsiteStats | null;
  // Visiteurs uniques actifs sur les 5 dernières min — refresh toutes
  // les 30s côté serveur.
  activeVisitors: number | null;
  funnel: WizardFunnelStep[] | null;
  pasteToPublish: PasteToPublishStats | null;
  pasteToPublishBuckets: PasteToPublishBuckets | null;
  geminiTriggers: GeminiTriggerCounts | null;
  pasteKind: PasteKindBreakdown | null;
  confirmEntered: number | null;
  // Funnel post-création : ce que font les visiteurs quand ils
  // arrivent sur une sortie partagée. Trou majeur avant 2026-05.
  outingFunnel: OutingPageFunnel | null;
  shareChannels: ShareChannelBreakdown | null;
  rsvpBreakdown: RsvpBreakdown | null;
  topReferrers: MetricRow[] | null;
  topPaths: MetricRow[] | null;
};

/**
 * Façade unique pour la page /sortie/admin/stat. Lance les calls
 * Umami en parallèle, normalise les réponses en formes prêtes à
 * rendre, et expose `configured` pour que le composant puisse afficher
 * un fallback "configure UMAMI_API_KEY" plutôt qu'un état vide trompeur.
 */
export async function getWizardUmamiStats(rangeDays = 7): Promise<WizardUmamiStats> {
  const configured = isUmamiConfigured();
  if (!configured) {
    return {
      configured: false,
      rangeDays,
      siteStats: null,
      activeVisitors: null,
      funnel: null,
      pasteToPublish: null,
      pasteToPublishBuckets: null,
      geminiTriggers: null,
      pasteKind: null,
      confirmEntered: null,
      outingFunnel: null,
      shareChannels: null,
      rsvpBreakdown: null,
      topReferrers: null,
      topPaths: null,
    };
  }
  const range = lastNDaysRange(rangeDays);
  const [
    siteStats,
    activeVisitors,
    eventCounts,
    distribution,
    buckets,
    triggers,
    pasteKindRows,
    shareChannelRows,
    rsvpRows,
    topReferrers,
    topPaths,
  ] = await Promise.all([
    getWebsiteStats(range),
    getActiveVisitors(),
    // 1 seul call qui sert à la fois au funnel wizard, au confirm count
    // et au funnel outing-page — on ne paie pas 3 RTT pour 3 reads sur
    // la même série temporelle.
    getEventCounts(range),
    getPasteToPublishDistribution(range),
    getPasteToPublishBuckets(range),
    getGeminiTriggerBreakdown(range),
    getPasteKindBreakdown(range),
    getShareChannelBreakdown(range),
    getRsvpResponseBreakdown(range),
    getTopMetric(range, "referrer"),
    getTopMetric(range, "url"),
  ]);

  // Funnel wizard reconstruit depuis le map d'event counts.
  const funnel: WizardFunnelStep[] | null = eventCounts
    ? [
        "wizard_step_paste_entered",
        "wizard_paste_submitted",
        "wizard_step_date_entered",
        "wizard_step_commit_entered",
        "wizard_publish_succeeded",
      ].map((event) => ({ event, count: eventCounts.get(event) ?? 0 }))
    : null;

  const confirmEntered = eventCounts ? (eventCounts.get("wizard_step_confirm_entered") ?? 0) : null;

  // Funnel outing-page : view (page vue) → RSVP set (action) →
  // share clicked (action propagation côté créateur).
  const outingFunnel: OutingPageFunnel | null = eventCounts
    ? {
        views: eventCounts.get("outing_viewed") ?? 0,
        rsvps: eventCounts.get("outing_rsvp_set") ?? 0,
        shares: eventCounts.get("outing_share_clicked") ?? 0,
      }
    : null;

  const pasteToPublish = distribution ? computePercentiles(distribution) : null;

  let pasteToPublishBuckets: PasteToPublishBuckets | null = null;
  if (buckets) {
    const out: PasteToPublishBuckets = { lt5s: 0, s5to15: 0, s15to60: 0, gt60s: 0, total: 0 };
    for (const row of buckets) {
      switch (row.value) {
        case "lt5s":
          out.lt5s += row.total;
          break;
        case "5-15s":
          out.s5to15 += row.total;
          break;
        case "15-60s":
          out.s15to60 += row.total;
          break;
        case "gt60s":
          out.gt60s += row.total;
          break;
      }
      out.total += row.total;
    }
    pasteToPublishBuckets = out;
  }

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

  let shareChannels: ShareChannelBreakdown | null = null;
  if (shareChannelRows) {
    const out: ShareChannelBreakdown = {
      whatsapp: 0,
      native: 0,
      copy: 0,
      other: 0,
      total: 0,
    };
    for (const row of shareChannelRows) {
      if (row.value === "whatsapp" || row.value === "native" || row.value === "copy") {
        out[row.value] += row.total;
      } else {
        out.other += row.total;
      }
      out.total += row.total;
    }
    shareChannels = out;
  }

  let rsvpBreakdown: RsvpBreakdown | null = null;
  if (rsvpRows) {
    const out: RsvpBreakdown = { yes: 0, no: 0, handleOwn: 0, total: 0 };
    for (const row of rsvpRows) {
      if (row.value === "yes") {
        out.yes += row.total;
      } else if (row.value === "no") {
        out.no += row.total;
      } else if (row.value === "handle_own") {
        out.handleOwn += row.total;
      }
      out.total += row.total;
    }
    rsvpBreakdown = out;
  }

  return {
    configured,
    rangeDays,
    siteStats,
    activeVisitors,
    funnel,
    pasteToPublish,
    pasteToPublishBuckets,
    geminiTriggers,
    pasteKind,
    confirmEntered,
    outingFunnel,
    shareChannels,
    rsvpBreakdown,
    topReferrers,
    topPaths,
  };
}
