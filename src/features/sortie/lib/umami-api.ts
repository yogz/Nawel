import { logger } from "@/lib/logger";

/**
 * Client serveur léger pour l'API Umami Cloud. Utilisé par la page
 * /sortie/admin/stat pour afficher les métriques du wizard et de
 * l'usage produit sans dupliquer le tracking côté BDD.
 *
 * Auth : header `x-umami-api-key` avec une clé personnelle générée
 * via Umami → Settings → API keys (1 par compte). Limite 50 req/15s
 * — largement suffisant tant qu'on cache la réponse côté Next.js.
 *
 * Toutes les fonctions sont best-effort : Umami down ou clé absente
 * → retourne null, le caller affiche un fallback. Jamais de throw.
 */

const API_BASE = process.env.UMAMI_API_BASE ?? "https://api.umami.is/v1";
const API_KEY = process.env.UMAMI_API_KEY;
// Site Umami dédié à Sortie (cf. `(sortie)/layout.tsx`). En env on
// préfère lire `UMAMI_WEBSITE_ID` pour pouvoir override en dev/preview ;
// fallback hardcodé si la var n'est pas set (cas local courant).
const WEBSITE_ID = process.env.UMAMI_WEBSITE_ID ?? "76add338-a076-4a94-98ba-d78dc7bc212d";

export function isUmamiConfigured(): boolean {
  return Boolean(API_KEY);
}

export type Range = { startAt: number; endAt: number };

/**
 * Range par défaut : les N derniers jours en ms epoch (ce que
 * l'API Umami attend pour `startAt`/`endAt`).
 */
export function lastNDaysRange(n = 7): Range {
  const endAt = Date.now();
  const startAt = endAt - n * 86_400_000;
  return { startAt, endAt };
}

async function umamiFetch<T>(
  path: string,
  params: Record<string, string | number>,
  init?: { revalidate?: number }
): Promise<T | null> {
  if (!API_KEY) {
    return null;
  }
  const url = new URL(`${API_BASE}/websites/${WEBSITE_ID}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  try {
    const res = await fetch(url.toString(), {
      headers: { "x-umami-api-key": API_KEY },
      // Revalidate court par défaut (5 min). `/active` overrride à 30 s
      // pour garder la sensation temps-réel sur le dashboard sans
      // burner la ration de 50 req/15 s.
      next: { revalidate: init?.revalidate ?? 300 },
    });
    if (!res.ok) {
      logger.warn("[umami-api] non-ok response", { path, status: res.status });
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    logger.warn("[umami-api] fetch failed", {
      path,
      message: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

// ─── Funnel counts ──────────────────────────────────────────────────
//
// Avant 2026-05 le funnel envoyait 5 requêtes vers `/events/stats` avec
// un paramètre `event` non-documenté que l'endpoint ignorait — résultat
// les 5 requêtes retournaient le total global et le funnel affichait
// 100% partout. Depuis ce refactor on tape une seule fois `/events/series`
// qui renvoie `[{ x: eventName, t, y: count }]` pour TOUS les events de
// la période, et on agrège côté code en sommant les y par x.
//
// Bénéfices : 1 call au lieu de 5, l'endpoint est documenté, et on peut
// découvrir les events oubliés en regardant la réponse brute.
//
// Le funnel garde 5 steps qui marquent une vraie progression :
//   1. paste_entered    — visite la step initiale (toujours)
//   2. paste_submitted  — a tapé qqch + cliqué next (signe d'engagement)
//   3. date_entered     — a passé le branching paste/title/confirm
//   4. commit_entered   — a atteint la step finale (revue avant publish)
//   5. publish_succeeded — a cliqué publish ET serveur OK
const WIZARD_STEP_EVENTS = [
  "wizard_step_paste_entered",
  "wizard_paste_submitted",
  "wizard_step_date_entered",
  "wizard_step_commit_entered",
  "wizard_publish_succeeded",
] as const;

export type WizardFunnelStep = {
  event: string;
  count: number;
};

type EventsSeriesRow = { x: string; t: string; y: number };

/**
 * Récupère TOUS les events nommés sur la période en 1 call et indexe
 * par nom. Sert à la fois au funnel wizard et à n'importe quel autre
 * compteur d'event ad-hoc qu'on voudra exposer côté dashboard.
 */
export async function getEventCounts(range: Range): Promise<Map<string, number> | null> {
  // `unit=day` est requis par /events/series pour bucketiser ; on
  // somme tout ensuite côté code, l'unit ne change pas le total.
  const rows = await umamiFetch<EventsSeriesRow[]>("/events/series", {
    startAt: range.startAt,
    endAt: range.endAt,
    unit: "day",
    timezone: "Europe/Paris",
  });
  if (!rows) {
    return null;
  }
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.x, (counts.get(row.x) ?? 0) + row.y);
  }
  return counts;
}

export async function getWizardFunnelCounts(range: Range): Promise<WizardFunnelStep[] | null> {
  const counts = await getEventCounts(range);
  if (!counts) {
    return null;
  }
  return WIZARD_STEP_EVENTS.map((event) => ({ event, count: counts.get(event) ?? 0 }));
}

// ─── Distributions (event-data/values) ───────────────────────────────

type EventDataValuesResponse = Array<{ value: string; total: number }>;

/**
 * Distribution des buckets `paste_to_publish_bucket` (string court :
 * "lt5s", "5-15s", "15-60s", "gt60s") sur les publish réussis. La
 * propriété `paste_to_publish_ms` reste émise en parallèle pour les
 * percentiles fins, mais pour l'affichage rapide du dashboard on lit
 * directement les buckets — 4 valeurs max au lieu de N continues.
 */
export async function getPasteToPublishBuckets(
  range: Range
): Promise<EventDataValuesResponse | null> {
  return umamiFetch<EventDataValuesResponse>("/event-data/values", {
    startAt: range.startAt,
    endAt: range.endAt,
    eventName: "wizard_publish_succeeded",
    propertyName: "paste_to_publish_bucket",
  });
}

/**
 * Distribution brute des `paste_to_publish_ms` (1 valeur par publish).
 * Utilisé pour calculer médiane/p90 fins quand le volume reste raisonnable
 * (<500 publish). Au-delà, préférer `getPasteToPublishBuckets`.
 */
export async function getPasteToPublishDistribution(
  range: Range
): Promise<EventDataValuesResponse | null> {
  return umamiFetch<EventDataValuesResponse>("/event-data/values", {
    startAt: range.startAt,
    endAt: range.endAt,
    eventName: "wizard_publish_succeeded",
    propertyName: "paste_to_publish_ms",
  });
}

/**
 * Breakdown des triggers Gemini : auto (legacy avant PR2a), optin
 * (PR2a/2c, attente acceptée par l'user) et bg (PR2b, lancé en
 * arrière-plan sur texte libre). Permet de lire d'un coup d'œil :
 *   - Si `optin` >> 0 → l'opt-in est utilisé
 *   - Si `auto` revient à >0 après le déploiement PR2c → bug
 *   - Si `bg` est nul mais texte libre fréquent → l'effet PR2b
 *     ne déclenche pas comme attendu
 */
export async function getGeminiTriggerBreakdown(
  range: Range
): Promise<EventDataValuesResponse | null> {
  return umamiFetch<EventDataValuesResponse>("/event-data/values", {
    startAt: range.startAt,
    endAt: range.endAt,
    eventName: "wizard_gemini_started",
    propertyName: "trigger",
  });
}

/**
 * Breakdown URL vs texte libre sur la step paste : quelle proportion
 * des users qui submit ont collé un lien (path FIXED, paster OG/TM
 * actif) vs tapé du texte (path MANUAL, fallback Gemini).
 */
export async function getPasteKindBreakdown(range: Range): Promise<EventDataValuesResponse | null> {
  return umamiFetch<EventDataValuesResponse>("/event-data/values", {
    startAt: range.startAt,
    endAt: range.endAt,
    eventName: "wizard_paste_submitted",
    propertyName: "kind",
  });
}

/**
 * Breakdown des canaux de partage outing — buildé à partir de la
 * propriété `channel` sur l'event `outing_share_clicked` (whatsapp,
 * native, copy, fallback_prompt). Permet de mesurer la viralité par
 * canal et de comparer à `outing_viewed { source }`.
 */
export async function getShareChannelBreakdown(
  range: Range
): Promise<EventDataValuesResponse | null> {
  return umamiFetch<EventDataValuesResponse>("/event-data/values", {
    startAt: range.startAt,
    endAt: range.endAt,
    eventName: "outing_share_clicked",
    propertyName: "channel",
  });
}

/**
 * Breakdown des réponses RSVP (yes/no/handle_own). Utile pour mesurer
 * le ratio de oui sur l'ensemble du trafic — un signal de qualité du
 * funnel d'invitation (un lien partagé qui ramène 80% de "oui" est
 * un meilleur produit qu'un lien partagé à 30% de "oui").
 */
export async function getRsvpResponseBreakdown(
  range: Range
): Promise<EventDataValuesResponse | null> {
  return umamiFetch<EventDataValuesResponse>("/event-data/values", {
    startAt: range.startAt,
    endAt: range.endAt,
    eventName: "outing_rsvp_set",
    propertyName: "response",
  });
}

/**
 * Causes d'échec du publish wizard : `validation` (input invalide),
 * `server` (erreur 5xx ou exception backend), `network` (fetch KO).
 * Lecture critique : `server > 0` ou `network > 0` indique un bug
 * en prod silencieux pour l'utilisateur (toast d'erreur générique)
 * mais visible côté dashboard.
 */
export async function getPublishFailedReasons(
  range: Range
): Promise<EventDataValuesResponse | null> {
  return umamiFetch<EventDataValuesResponse>("/event-data/values", {
    startAt: range.startAt,
    endAt: range.endAt,
    eventName: "wizard_publish_failed",
    propertyName: "reason",
  });
}

/**
 * Distribution des `last_step` sur `wizard_abandoned`. Répond directement
 * à « où on perd les users dans le wizard ». Lisible même à faible
 * volume (n=5 abandons par semaine donne déjà une indication directionnelle).
 */
export async function getWizardAbandonedSteps(
  range: Range
): Promise<EventDataValuesResponse | null> {
  return umamiFetch<EventDataValuesResponse>("/event-data/values", {
    startAt: range.startAt,
    endAt: range.endAt,
    eventName: "wizard_abandoned",
    propertyName: "last_step",
  });
}

/**
 * Source d'arrivée sur une page sortie : `share` (lien externe partagé,
 * referrer hors-site), `internal` (navigation interne dans Sortie),
 * `direct` (URL tapée / bookmark / sans referrer). Mesure la part du
 * partage actif dans l'acquisition de vues.
 */
export async function getOutingViewedSources(
  range: Range
): Promise<EventDataValuesResponse | null> {
  return umamiFetch<EventDataValuesResponse>("/event-data/values", {
    startAt: range.startAt,
    endAt: range.endAt,
    eventName: "outing_viewed",
    propertyName: "source",
  });
}

// ─── Vue d'ensemble Umami : stats + active + metrics ─────────────────

export type WebsiteStats = {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
  comparison?: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
  };
};

type ApiStatsValue = number | { value?: number };

/**
 * Stats globales du site sur la période, avec comparaison automatique
 * sur la période précédente de même longueur (Umami inclut `comparison`
 * dans la réponse). Permet d'afficher visiteurs/pageviews + delta % sans
 * 2ᵉ call.
 *
 * Note : selon la version d'Umami Cloud, les KPIs peuvent arriver soit
 * en nombre direct (`{ visitors: 42 }`), soit sous forme objet
 * (`{ visitors: { value: 42 } }`). On normalise dans les 2 sens.
 */
export async function getWebsiteStats(range: Range): Promise<WebsiteStats | null> {
  const raw = await umamiFetch<Record<string, ApiStatsValue | unknown>>("/stats", {
    startAt: range.startAt,
    endAt: range.endAt,
  });
  if (!raw) {
    return null;
  }
  const num = (v: unknown): number => {
    if (typeof v === "number") {
      return v;
    }
    if (v && typeof v === "object" && "value" in v && typeof v.value === "number") {
      return v.value;
    }
    return 0;
  };
  const out: WebsiteStats = {
    pageviews: num(raw.pageviews),
    visitors: num(raw.visitors),
    visits: num(raw.visits),
    bounces: num(raw.bounces),
    totaltime: num(raw.totaltime),
  };
  const cmp = raw.comparison;
  if (cmp && typeof cmp === "object") {
    const c = cmp as Record<string, ApiStatsValue | unknown>;
    out.comparison = {
      pageviews: num(c.pageviews),
      visitors: num(c.visitors),
      visits: num(c.visits),
      bounces: num(c.bounces),
      totaltime: num(c.totaltime),
    };
  }
  return out;
}

/**
 * Visiteurs actifs sur les 5 dernières minutes. Cache court (30 s) pour
 * que la sensation "live" reste sans envoyer une requête à chaque
 * navigation interne. Renvoie 0 si Umami est down — distinction "vrai 0"
 * vs "fetch KO" portée par le `null` du wrapper englobant.
 */
export async function getActiveVisitors(): Promise<number | null> {
  const data = await umamiFetch<{ visitors?: number; x?: number }>(
    "/active",
    {},
    { revalidate: 30 }
  );
  if (!data) {
    return null;
  }
  // `visitors` est le format documenté ; on accepte aussi `x` pour les
  // versions plus anciennes qui le renvoyaient sous ce nom.
  return typeof data.visitors === "number"
    ? data.visitors
    : typeof data.x === "number"
      ? data.x
      : 0;
}

export type MetricRow = { name: string; value: number };

/**
 * Top-N pour une dimension standard (referrer, url, browser, os, country…).
 * Utilise `/metrics` en priorité (endpoint historique stable) avec
 * fallback vers `/metrics/expanded` qui renvoie une forme étendue. Les
 * 2 endpoints partagent le même schéma de query (type + range).
 */
export async function getTopMetric(
  range: Range,
  type: "url" | "referrer" | "browser" | "os" | "country" | "device" | "event",
  limit = 8
): Promise<MetricRow[] | null> {
  type RawRow = {
    name?: string;
    x?: string;
    value?: number;
    y?: number;
    visitors?: number;
    pageviews?: number;
  };
  const rows = await umamiFetch<RawRow[]>("/metrics", {
    startAt: range.startAt,
    endAt: range.endAt,
    type,
    limit,
  });
  if (!rows) {
    return null;
  }
  return rows
    .map((r) => ({
      name: r.name ?? r.x ?? "(inconnu)",
      // `/metrics` renvoie `value` (count d'événements ou de pageviews
      // selon le type). Fallbacks pour les variantes connues.
      value: r.value ?? r.y ?? r.visitors ?? r.pageviews ?? 0,
    }))
    .filter((r) => r.value > 0)
    .slice(0, limit);
}

// ─── Helper de calculs côté Node ─────────────────────────────────────

/**
 * Calcule médiane et p90 à partir d'un dictionnaire valeur→count
 * (output direct de `event-data/values`). Renvoie null si vide.
 * Utilisé pour `paste_to_publish_ms` — on veut connaître la médiane
 * sans avoir à exporter en CSV.
 *
 * Garde-fou : si la série reconstruite dépasse 10 000 points (peu
 * probable sur la période 30j d'un site naissant, mais cap quand même
 * pour éviter un OOM si un jour Umami remonte des dizaines de milliers
 * de buckets distincts), on tronque en gardant la distribution.
 */
export function computePercentiles(
  rows: EventDataValuesResponse
): { count: number; median: number; p90: number } | null {
  if (rows.length === 0) {
    return null;
  }
  const MAX = 10_000;
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  const factor = total > MAX ? MAX / total : 1;
  const values: number[] = [];
  for (const row of rows) {
    const v = Number(row.value);
    if (!Number.isFinite(v)) {
      continue;
    }
    const repeats = factor === 1 ? row.total : Math.max(1, Math.round(row.total * factor));
    for (let i = 0; i < repeats; i++) {
      values.push(v);
    }
  }
  if (values.length === 0) {
    return null;
  }
  values.sort((a, b) => a - b);
  const pick = (q: number) => values[Math.min(values.length - 1, Math.floor(q * values.length))]!;
  return {
    count: total,
    median: pick(0.5),
    p90: pick(0.9),
  };
}
