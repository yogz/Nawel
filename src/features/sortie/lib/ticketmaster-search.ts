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
 * Best-effort search against the Ticketmaster Discovery API.
 *
 * Returns an empty array for any failure mode (missing key, network
 * error, non-2xx response, malformed payload) — the caller decides how
 * to surface it. Logs warnings to the console so ops can see rate-limit
 * / auth issues without breaking user flows.
 *
 * The route at `/api/sortie/search-ticketmaster` wraps this with a
 * short-lived cache; the URL-parser at `/api/sortie/parse-ticket-url`
 * calls it directly when enriching a ticketmaster.fr link.
 */
export async function searchTicketmasterEvents(
  query: string,
  limit: number
): Promise<TicketmasterResult[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    return [];
  }

  const url = new URL(TM_BASE_URL);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("keyword", query);
  url.searchParams.set("countryCode", "FR");
  url.searchParams.set("size", String(limit));
  url.searchParams.set("locale", "fr-fr");
  url.searchParams.set("sort", "date,asc");

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      console.warn("[ticketmaster] non-2xx", response.status);
      return [];
    }
    const data = (await response.json()) as { _embedded?: { events?: unknown } };
    const eventsRaw = data._embedded?.events;
    if (!Array.isArray(eventsRaw)) {
      return [];
    }
    const results: TicketmasterResult[] = [];
    for (const raw of eventsRaw) {
      const mapped = mapEvent(raw as TmEvent);
      if (mapped) {
        results.push(mapped);
      }
      if (results.length >= limit) {
        break;
      }
    }
    return results;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.warn("[ticketmaster] fetch failed:", message);
    return [];
  }
}
