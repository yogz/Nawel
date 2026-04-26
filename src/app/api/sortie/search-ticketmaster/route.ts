import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sanitizeText } from "@/lib/sanitize";
import {
  searchTicketmasterEventsWithSpellcheck,
  type TicketmasterResult,
} from "@/features/sortie/lib/ticketmaster-search";

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

const CACHE_TTL_MS = 60_000;
const MAX_RESULTS = 3;

// Re-exported so existing client-side imports (`create-wizard`) keep
// resolving to the same type. The shape lives in the shared lib now.
export type { TicketmasterResult };

type CachedSearch = {
  ts: number;
  results: TicketmasterResult[];
  correctedQuery: string | null;
};

// Single-process LRU-ish cache. Acceptable for "best-effort" — within a
// warm Vercel container we avoid hammering Ticketmaster while users type
// and pause. Cold containers redo the work, which is fine.
const cache = new Map<string, CachedSearch>();

function readCache(key: string): CachedSearch | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function writeCache(key: string, value: Omit<CachedSearch, "ts">): void {
  // Soft cap to avoid unbounded growth in a long-lived container.
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    if (oldest) {
      cache.delete(oldest);
    }
  }
  cache.set(key, { ts: Date.now(), ...value });
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
    return NextResponse.json({ results: [], correctedQuery: null });
  }

  const cacheKey = cleaned.toLowerCase();
  const cached = readCache(cacheKey);
  if (cached) {
    return NextResponse.json({
      results: cached.results,
      correctedQuery: cached.correctedQuery,
    });
  }

  const { results, correctedQuery } = await searchTicketmasterEventsWithSpellcheck(
    cleaned,
    MAX_RESULTS
  );
  writeCache(cacheKey, { results, correctedQuery });
  return NextResponse.json({ results, correctedQuery });
}
