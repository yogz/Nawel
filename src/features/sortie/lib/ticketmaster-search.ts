import { trackServiceCall, type ServiceSource } from "./service-call-stats";

// Sources d'appel possibles à TM. Type étroit pour qu'à la lecture du
// dashboard les libellés ne se mélangent pas (ex. "search" vs "wizard-
// search"). Les sources Gemini ne sont pas listées ici — type "find
// EventDetails" est utilisé exclusivement dans gemini-search.ts.
type TicketmasterSource = Extract<ServiceSource, "wizard-search" | "spellcheck" | "parse-enrich">;

export type TicketmasterResult = {
  id: string;
  title: string;
  venue: string | null;
  city: string | null;
  image: string | null;
  startsAt: string | null;
  ticketUrl: string;
};

const TM_BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json";
const TIMEOUT_MS = 5000;

type TmImage = { url?: unknown; ratio?: unknown; width?: unknown };
type TmVenue = { name?: unknown; city?: { name?: unknown } };
type TmEvent = {
  id?: unknown;
  name?: unknown;
  url?: unknown;
  images?: unknown;
  dates?: { start?: { dateTime?: unknown; dateTBA?: unknown } };
  _embedded?: { venues?: unknown };
};

function pickImage(images: unknown): string | null {
  if (!Array.isArray(images)) {
    return null;
  }
  // Prefer a 16:9 image with the largest width ≤ 1200 (covers the
  // hero strip on /nouvelle without dragging a 2 MB poster). Fall back
  // to the first image with a usable URL.
  let best: { url: string; width: number } | null = null;
  for (const raw of images) {
    const img = raw as TmImage;
    const url = typeof img?.url === "string" ? img.url : null;
    if (!url) {
      continue;
    }
    const ratio = typeof img.ratio === "string" ? img.ratio : null;
    const width = typeof img.width === "number" ? img.width : 0;
    if (ratio === "16_9" && width > 0 && width <= 1200) {
      if (!best || width > best.width) {
        best = { url, width };
      }
    }
  }
  if (best) {
    return best.url;
  }
  for (const raw of images) {
    const img = raw as TmImage;
    if (typeof img?.url === "string") {
      return img.url;
    }
  }
  return null;
}

function mapEvent(event: TmEvent): TicketmasterResult | null {
  const id = typeof event.id === "string" ? event.id : null;
  const title = typeof event.name === "string" ? event.name.trim() : null;
  const ticketUrl = typeof event.url === "string" ? event.url : null;
  if (!id || !title || !ticketUrl) {
    return null;
  }
  const venuesRaw = event._embedded?.venues;
  const venue0 = Array.isArray(venuesRaw) ? (venuesRaw[0] as TmVenue | undefined) : undefined;
  const venue = typeof venue0?.name === "string" ? venue0.name : null;
  const city = typeof venue0?.city?.name === "string" ? venue0.city.name : null;
  const dateTBA = event.dates?.start?.dateTBA === true;
  const dateTime = event.dates?.start?.dateTime;
  const startsAt = !dateTBA && typeof dateTime === "string" ? dateTime : null;
  return {
    id,
    title,
    venue,
    city,
    image: pickImage(event.images),
    startsAt,
    ticketUrl,
  };
}

/**
 * Outcome of a search call when spellcheck is enabled. `correctedQuery`
 * est non-null seulement quand l'API a proposé une orthographe et qu'on
 * a relancé la recherche dessus avec succès — l'UI peut afficher
 * "Résultats pour 'roland' (au lieu de 'rolland')".
 */
export type TicketmasterSearchOutcome = {
  results: TicketmasterResult[];
  correctedQuery: string | null;
};

/**
 * Best-effort search against the Ticketmaster Discovery API.
 *
 * Returns an empty array for any failure mode (missing key, network
 * error, non-2xx response, malformed payload) — the caller decides how
 * to surface it. Logs warnings to the console so ops can see rate-limit
 * / auth issues without breaking user flows.
 *
 * Appelée par l'orchestrateur multi-sources (`searchEvents`) et
 * directement par `/api/sortie/parse-ticket-url` pour enrichir un
 * lien ticketmaster.fr. La spellcheck est exposée séparément via
 * `searchTicketmasterEventsWithSpellcheck` plus bas.
 */
export async function searchTicketmasterEvents(
  query: string,
  limit: number,
  source: Exclude<TicketmasterSource, "spellcheck">
): Promise<TicketmasterResult[]> {
  const { results } = await fetchTicketmaster(query, limit, false, source);
  return results;
}

/**
 * Variante avec spellcheck : si la 1re recherche ne retourne rien et
 * que l'API propose une correction d'orthographe, on relance une 2e
 * fois avec la suggestion. Évite de basculer sur le fallback Gemini
 * (rate-limited + payant) pour des fautes triviales du genre
 * "rolland" → "roland".
 *
 * `correctedQuery` est défini uniquement quand le 2e appel a ramené
 * au moins un résultat — sinon on retourne le tableau vide initial
 * et on laisse le pipeline continuer normalement.
 */
export async function searchTicketmasterEventsWithSpellcheck(
  query: string,
  limit: number
): Promise<TicketmasterSearchOutcome> {
  // Les deux fetch internes sont tagués "spellcheck" : l'appel
  // initial avec includeSpellcheck=yes ET la re-recherche sur la
  // suggestion font partie du même parcours user.
  const first = await fetchTicketmaster(query, limit, true, "spellcheck");
  if (first.results.length > 0) {
    return { results: first.results, correctedQuery: null };
  }
  const suggestion = first.spellcheckSuggestion;
  if (!suggestion) {
    return { results: [], correctedQuery: null };
  }
  const normalized = suggestion.trim();
  if (!normalized || normalized.toLowerCase() === query.trim().toLowerCase()) {
    return { results: [], correctedQuery: null };
  }
  const second = await fetchTicketmaster(normalized, limit, false, "spellcheck");
  if (second.results.length === 0) {
    return { results: [], correctedQuery: null };
  }
  return { results: second.results, correctedQuery: normalized };
}

type RawSearchResult = {
  results: TicketmasterResult[];
  spellcheckSuggestion: string | null;
};

async function fetchTicketmaster(
  query: string,
  limit: number,
  withSpellcheck: boolean,
  source: TicketmasterSource
): Promise<RawSearchResult> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    // Pas d'appel parti → on ne tracke rien : la métrique mesure
    // l'usage réel du service, pas la config locale.
    return { results: [], spellcheckSuggestion: null };
  }

  const url = new URL(TM_BASE_URL);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("keyword", query);
  url.searchParams.set("countryCode", "FR");
  url.searchParams.set("size", String(limit));
  url.searchParams.set("locale", "fr-fr");
  url.searchParams.set("sort", "date,asc");
  if (withSpellcheck) {
    url.searchParams.set("includeSpellcheck", "yes");
  }

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      console.warn("[ticketmaster] non-2xx", response.status);
      trackServiceCall("ticketmaster", source, "error", `http_${response.status}`);
      return { results: [], spellcheckSuggestion: null };
    }
    const data = (await response.json()) as {
      _embedded?: { events?: unknown };
      spellcheck?: unknown;
    };
    const eventsRaw = data._embedded?.events;
    const results: TicketmasterResult[] = [];
    if (Array.isArray(eventsRaw)) {
      for (const raw of eventsRaw) {
        const mapped = mapEvent(raw as TmEvent);
        if (mapped) {
          results.push(mapped);
        }
        if (results.length >= limit) {
          break;
        }
      }
    }
    const spellcheckSuggestion = withSpellcheck
      ? extractSpellcheckSuggestion(data.spellcheck)
      : null;
    trackServiceCall("ticketmaster", source, results.length > 0 ? "found" : "no_match");
    return { results, spellcheckSuggestion };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.warn("[ticketmaster] fetch failed:", message);
    trackServiceCall("ticketmaster", source, "error", message);
    return { results: [], spellcheckSuggestion: null };
  }
}

/**
 * Tente d'extraire la correction d'orthographe la plus utile du champ
 * `spellcheck` de la réponse Ticketmaster. La doc officielle ne précise
 * pas le format exact — d'expérience c'est du Solr-like avec des
 * variantes selon l'âge de l'endpoint, donc on essaie plusieurs formes
 * en priorisant les `collations` (= la requête entière corrigée) avant
 * les suggestions mot-à-mot.
 *
 * Retourne null si le format est inconnu — le caller continue sans
 * retry et le fallback Gemini prend le relais comme avant.
 */
function extractSpellcheckSuggestion(spellcheck: unknown): string | null {
  if (!spellcheck || typeof spellcheck !== "object") {
    return null;
  }
  const sc = spellcheck as Record<string, unknown>;

  // Préférence 1 : collations (la requête entière corrigée). Format
  // Solr classique : ["roland garros"] ; ou format objet :
  // [{ collationQuery: "roland garros", hits: 12 }].
  const collations = sc.collations;
  if (Array.isArray(collations)) {
    for (const entry of collations) {
      if (typeof entry === "string" && entry.trim().length > 0) {
        return entry.trim();
      }
      if (entry && typeof entry === "object") {
        const cq = (entry as Record<string, unknown>).collationQuery;
        if (typeof cq === "string" && cq.trim().length > 0) {
          return cq.trim();
        }
      }
    }
  }

  // Préférence 2 : premier suggestion. Plusieurs formats observés :
  //   - Solr classic alterné : [misspelled, { suggestion: ["fix"] }, …]
  //   - Solr récent : [{ word: "fix", freq: 100 }]
  //   - Variante simple : [{ suggestion: "fix" }]
  const suggestions = sc.suggestions;
  if (Array.isArray(suggestions)) {
    for (const entry of suggestions) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const obj = entry as Record<string, unknown>;
      const inner = obj.suggestion;
      if (typeof inner === "string" && inner.trim().length > 0) {
        return inner.trim();
      }
      if (Array.isArray(inner)) {
        for (const item of inner) {
          if (typeof item === "string" && item.trim().length > 0) {
            return item.trim();
          }
          if (item && typeof item === "object") {
            const word = (item as Record<string, unknown>).word;
            if (typeof word === "string" && word.trim().length > 0) {
              return word.trim();
            }
          }
        }
      }
      const word = obj.word;
      if (typeof word === "string" && word.trim().length > 0) {
        return word.trim();
      }
    }
  }

  return null;
}
