import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sanitizeText } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Best-effort enrichment search against the Ticketmaster Discovery API.
 *
 * Called from the create-wizard PasteStep when the user types something
 * that doesn't look like a URL. We do NOT block their flow: any failure
 * mode (missing key, network error, empty result, invalid response)
 * returns `{ results: [] }` with HTTP 200. The client treats an empty
 * list as "no suggestions" and renders nothing — the user keeps typing.
 *
 * Validation errors (input too short / too long) DO return 4xx so the
 * client can fix bad calls; everything else stays silent on purpose.
 */

const inputSchema = z.object({
  query: z.string().min(3).max(200),
});

const TM_BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json";
const TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 60_000;
const MAX_RESULTS = 3;

export type TicketmasterResult = {
  id: string;
  title: string;
  venue: string | null;
  city: string | null;
  image: string | null;
  startsAt: string | null;
  ticketUrl: string;
};

// Single-process LRU-ish cache. Acceptable for "best-effort" — within a
// warm Vercel container we avoid hammering Ticketmaster while users type
// and pause. Cold containers redo the work, which is fine.
const cache = new Map<string, { ts: number; results: TicketmasterResult[] }>();

function readCache(key: string): TicketmasterResult[] | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.results;
}

function writeCache(key: string, results: TicketmasterResult[]): void {
  // Soft cap to avoid unbounded growth in a long-lived container.
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    if (oldest) {
      cache.delete(oldest);
    }
  }
  cache.set(key, { ts: Date.now(), results });
}

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

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Sanitize before any further use — strips HTML/scripts/control chars.
  const cleaned = sanitizeText(parsed.data.query, 200);
  if (cleaned.length < 3) {
    // Sanitization can shrink the string below the floor — treat as
    // empty result rather than 4xx (user is mid-typing).
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    // Fail silent: the feature is best-effort, the wizard works without it.
    return NextResponse.json({ results: [] });
  }

  const cacheKey = cleaned.toLowerCase();
  const cached = readCache(cacheKey);
  if (cached) {
    return NextResponse.json({ results: cached });
  }

  const url = new URL(TM_BASE_URL);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("keyword", cleaned);
  url.searchParams.set("countryCode", "FR");
  url.searchParams.set("size", String(MAX_RESULTS));
  url.searchParams.set("locale", "fr-fr");
  url.searchParams.set("sort", "date,asc");

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      // Includes 401 (bad key), 429 (rate limit) — log for ops, swallow for UX.
      console.warn("[ticketmaster] non-2xx", response.status);
      return NextResponse.json({ results: [] });
    }
    const data = (await response.json()) as { _embedded?: { events?: unknown } };
    const eventsRaw = data._embedded?.events;
    if (!Array.isArray(eventsRaw)) {
      writeCache(cacheKey, []);
      return NextResponse.json({ results: [] });
    }
    const results: TicketmasterResult[] = [];
    for (const raw of eventsRaw) {
      const mapped = mapEvent(raw as TmEvent);
      if (mapped) {
        results.push(mapped);
      }
      if (results.length >= MAX_RESULTS) {
        break;
      }
    }
    writeCache(cacheKey, results);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.warn("[ticketmaster] fetch failed:", message);
    return NextResponse.json({ results: [] });
  }
}
