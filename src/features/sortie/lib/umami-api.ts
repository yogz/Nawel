import { logger } from "@/lib/logger";

/**
 * Client serveur léger pour l'API Umami Cloud. Utilisé par la page
 * /sortie/stat pour afficher les métriques du wizard sans dupliquer
 * le tracking côté BDD.
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
const WEBSITE_ID = process.env.UMAMI_WEBSITE_ID ?? "383d4d2b-6e94-4215-b02e-39ddc800134b";

export function isUmamiConfigured(): boolean {
  return Boolean(API_KEY);
}

type Range = { startAt: number; endAt: number };

/**
 * Range par défaut : les 7 derniers jours en ms epoch (ce que
 * l'API Umami attend pour `startAt`/`endAt`).
 */
export function lastNDaysRange(n = 7): Range {
  const endAt = Date.now();
  const startAt = endAt - n * 86_400_000;
  return { startAt, endAt };
}

async function umamiFetch<T>(
  path: string,
  params: Record<string, string | number>
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
      // Cache Next.js 5 min — 50 req/15s est large mais inutile de
      // burner la ration à chaque rafraîchissement de /stat.
      next: { revalidate: 300 },
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

// ─── Funnel counts (1 call par event = 6 calls totaux) ──────────────

const WIZARD_STEP_EVENTS = [
  "wizard_step_paste_entered",
  "wizard_step_date_entered",
  "wizard_step_venue_entered",
  "wizard_step_name_entered",
  "wizard_step_commit_entered",
  "wizard_publish_succeeded",
] as const;

export type WizardFunnelStep = {
  event: string;
  count: number;
};

type EventsStatsResponse = {
  pageviews?: { value: number };
  visitors?: { value: number };
  visits?: { value: number };
  events?: { value: number };
  uniqueEvents?: { value: number };
};

/**
 * Counts par event distinct sur la période. Pas de vrai funnel API
 * (pas trouvé d'endpoint « run funnel ad-hoc »), donc on récupère le
 * count de chaque event et le dashboard calcule les % de conversion
 * à partir de ça. Approximation : un user qui revient et fait 2 fois
 * la step paste compte 2× — sur des volumes courts ça reste une
 * indicaiton fiable.
 */
export async function getWizardFunnelCounts(range: Range): Promise<WizardFunnelStep[] | null> {
  if (!isUmamiConfigured()) {
    return null;
  }
  const results = await Promise.all(
    WIZARD_STEP_EVENTS.map(async (event) => {
      // L'endpoint /events/stats est globale au site ; on filtre par
      // event via query string `event` (supporté dans la plupart des
      // versions API Umami). Si Umami ne filtre pas, le count remonté
      // est trop large — on le détectera à la lecture (count identique
      // sur tous les events).
      const data = await umamiFetch<EventsStatsResponse>("/events/stats", {
        startAt: range.startAt,
        endAt: range.endAt,
        event,
      });
      return { event, count: data?.events?.value ?? 0 };
    })
  );
  return results;
}

// ─── Distribution paste→publish (groupby property value) ─────────────

type EventDataValuesResponse = Array<{ value: string; total: number }>;

/**
 * Distribution des valeurs `paste_to_publish_ms` (en ms) sur les
 * publish réussis. Umami retourne chaque valeur distincte avec son
 * nombre d'occurrences ; le dashboard reconstruit médiane / p90 à
 * partir de ces buckets.
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

// ─── Helper de calculs côté Node ─────────────────────────────────────

/**
 * Calcule médiane et p90 à partir d'un dictionnaire valeur→count
 * (output direct de `event-data/values`). Renvoie null si vide.
 * Utilisé pour `paste_to_publish_ms` — on veut connaître la médiane
 * sans avoir à exporter en CSV.
 */
export function computePercentiles(
  rows: EventDataValuesResponse
): { count: number; median: number; p90: number } | null {
  if (rows.length === 0) {
    return null;
  }
  // Reconstruit la série complète à partir des buckets value/total.
  // Volume max attendu : quelques centaines d'entrées pour un site
  // en dev, ne vaut pas la peine d'optimiser en streaming.
  const values: number[] = [];
  for (const row of rows) {
    const v = Number(row.value);
    if (!Number.isFinite(v)) {
      continue;
    }
    for (let i = 0; i < row.total; i++) {
      values.push(v);
    }
  }
  if (values.length === 0) {
    return null;
  }
  values.sort((a, b) => a - b);
  const pick = (q: number) => values[Math.min(values.length - 1, Math.floor(q * values.length))]!;
  return {
    count: values.length,
    median: pick(0.5),
    p90: pick(0.9),
  };
}
