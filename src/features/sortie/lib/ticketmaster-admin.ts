import { trackServiceCall } from "./service-call-stats";

/**
 * Vue *complète* d'un event Ticketmaster pour la console admin. À la
 * différence de `TicketmasterResult` (trimmé pour le wizard public),
 * on expose ici toutes les images + les métadonnées riches dont on
 * peut avoir besoin pour debugger / inspecter (classifications,
 * presales, info, attractions, etc.).
 *
 * Réservé strictement à la zone admin — le payload est dense et
 * contient parfois des notes business spécifiques à TM.
 */
export type TicketmasterAdminImage = {
  url: string;
  ratio: string | null;
  width: number | null;
  height: number | null;
  fallback: boolean;
};

export type TicketmasterAdminClassification = {
  segment: string | null;
  genre: string | null;
  subGenre: string | null;
};

export type TicketmasterAdminVenue = {
  name: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  country: string | null;
  timezone: string | null;
  url: string | null;
};

export type TicketmasterAdminAttraction = {
  id: string;
  name: string;
  url: string | null;
  image: string | null;
};

export type TicketmasterAdminPriceRange = {
  type: string | null;
  currency: string | null;
  min: number | null;
  max: number | null;
};

export type TicketmasterAdminEvent = {
  id: string;
  title: string;
  ticketUrl: string;
  startsAt: string | null;
  startLocalDate: string | null;
  startLocalTime: string | null;
  dateTBA: boolean;
  dateTBD: boolean;
  status: string | null;
  info: string | null;
  pleaseNote: string | null;
  classifications: TicketmasterAdminClassification[];
  venues: TicketmasterAdminVenue[];
  attractions: TicketmasterAdminAttraction[];
  images: TicketmasterAdminImage[];
  salesPublicStart: string | null;
  salesPublicEnd: string | null;
  presales: { name: string | null; startDateTime: string | null; endDateTime: string | null }[];
  priceRanges: TicketmasterAdminPriceRange[];
};

const TM_BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json";
const TIMEOUT_MS = 6000;

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function asBool(v: unknown): boolean {
  return v === true;
}

function mapImages(raw: unknown): TicketmasterAdminImage[] {
  if (!Array.isArray(raw)) return [];
  const out: TicketmasterAdminImage[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const img = r as Record<string, unknown>;
    const url = asString(img.url);
    if (!url) continue;
    out.push({
      url,
      ratio: asString(img.ratio),
      width: asNumber(img.width),
      height: asNumber(img.height),
      fallback: asBool(img.fallback),
    });
  }
  return out;
}

function mapClassifications(raw: unknown): TicketmasterAdminClassification[] {
  if (!Array.isArray(raw)) return [];
  const out: TicketmasterAdminClassification[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const c = r as Record<string, unknown>;
    const seg = c.segment as Record<string, unknown> | undefined;
    const gen = c.genre as Record<string, unknown> | undefined;
    const sub = c.subGenre as Record<string, unknown> | undefined;
    out.push({
      segment: seg ? asString(seg.name) : null,
      genre: gen ? asString(gen.name) : null,
      subGenre: sub ? asString(sub.name) : null,
    });
  }
  return out;
}

function mapVenues(raw: unknown): TicketmasterAdminVenue[] {
  if (!Array.isArray(raw)) return [];
  const out: TicketmasterAdminVenue[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const v = r as Record<string, unknown>;
    const city = v.city as Record<string, unknown> | undefined;
    const country = v.country as Record<string, unknown> | undefined;
    const addr = v.address as Record<string, unknown> | undefined;
    const tz = v.timezone;
    out.push({
      name: asString(v.name),
      city: city ? asString(city.name) : null,
      address: addr ? asString(addr.line1) : null,
      postalCode: asString(v.postalCode),
      country: country ? asString(country.name) : null,
      timezone: typeof tz === "string" ? tz : null,
      url: asString(v.url),
    });
  }
  return out;
}

function mapAttractions(raw: unknown): TicketmasterAdminAttraction[] {
  if (!Array.isArray(raw)) return [];
  const out: TicketmasterAdminAttraction[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const a = r as Record<string, unknown>;
    const id = asString(a.id);
    const name = asString(a.name);
    if (!id || !name) continue;
    const imgs = mapImages(a.images);
    out.push({
      id,
      name,
      url: asString(a.url),
      image: imgs[0]?.url ?? null,
    });
  }
  return out;
}

function mapPresales(raw: unknown): TicketmasterAdminEvent["presales"] {
  if (!Array.isArray(raw)) return [];
  const out: TicketmasterAdminEvent["presales"] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const p = r as Record<string, unknown>;
    out.push({
      name: asString(p.name),
      startDateTime: asString(p.startDateTime),
      endDateTime: asString(p.endDateTime),
    });
  }
  return out;
}

function mapPriceRanges(raw: unknown): TicketmasterAdminPriceRange[] {
  if (!Array.isArray(raw)) return [];
  const out: TicketmasterAdminPriceRange[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const pr = r as Record<string, unknown>;
    out.push({
      type: asString(pr.type),
      currency: asString(pr.currency),
      min: asNumber(pr.min),
      max: asNumber(pr.max),
    });
  }
  return out;
}

function mapEvent(event: unknown): TicketmasterAdminEvent | null {
  if (!event || typeof event !== "object") return null;
  const e = event as Record<string, unknown>;
  const id = asString(e.id);
  const title = asString(e.name);
  const ticketUrl = asString(e.url);
  if (!id || !title || !ticketUrl) return null;

  const dates = (e.dates as Record<string, unknown> | undefined) ?? {};
  const start = (dates.start as Record<string, unknown> | undefined) ?? {};
  const status = (dates.status as Record<string, unknown> | undefined) ?? {};
  const sales = (e.sales as Record<string, unknown> | undefined) ?? {};
  const publicSales = (sales.public as Record<string, unknown> | undefined) ?? {};
  const presales = sales.presales;
  const embedded = (e._embedded as Record<string, unknown> | undefined) ?? {};

  return {
    id,
    title,
    ticketUrl,
    startsAt: asString(start.dateTime),
    startLocalDate: asString(start.localDate),
    startLocalTime: asString(start.localTime),
    dateTBA: asBool(start.dateTBA),
    dateTBD: asBool(start.dateTBD),
    status: asString(status.code),
    info: asString(e.info),
    pleaseNote: asString(e.pleaseNote),
    classifications: mapClassifications(e.classifications),
    venues: mapVenues(embedded.venues),
    attractions: mapAttractions(embedded.attractions),
    images: mapImages(e.images),
    salesPublicStart: asString(publicSales.startDateTime),
    salesPublicEnd: asString(publicSales.endDateTime),
    presales: mapPresales(presales),
    priceRanges: mapPriceRanges(e.priceRanges),
  };
}

/**
 * Recherche TM admin — payload riche, tous les champs préservés.
 *
 * Hors quota wizard : on tracke l'appel sous la source `parse-enrich`
 * pour ne pas polluer les métriques wizard publiques avec du trafic
 * d'inspection humaine.
 */
export async function searchTicketmasterAdminFull(
  query: string,
  limit = 20
): Promise<{ results: TicketmasterAdminEvent[]; error: string | null }> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    return { results: [], error: "TICKETMASTER_API_KEY non configurée." };
  }
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { results: [], error: "Requête trop courte (min. 2 caractères)." };
  }

  const url = new URL(TM_BASE_URL);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("keyword", trimmed);
  url.searchParams.set("countryCode", "FR");
  url.searchParams.set("size", String(Math.min(50, Math.max(1, limit))));
  url.searchParams.set("locale", "fr-fr");
  url.searchParams.set("sort", "date,asc");

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      trackServiceCall("ticketmaster", "parse-enrich", "error", `http_${response.status}`);
      return { results: [], error: `TM HTTP ${response.status}` };
    }
    const data = (await response.json()) as { _embedded?: { events?: unknown } };
    const eventsRaw = data._embedded?.events;
    const results: TicketmasterAdminEvent[] = [];
    if (Array.isArray(eventsRaw)) {
      for (const raw of eventsRaw) {
        const mapped = mapEvent(raw);
        if (mapped) results.push(mapped);
      }
    }
    trackServiceCall("ticketmaster", "parse-enrich", results.length > 0 ? "found" : "no_match");
    return { results, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    trackServiceCall("ticketmaster", "parse-enrich", "error", message);
    return { results: [], error: `Échec : ${message}` };
  }
}
