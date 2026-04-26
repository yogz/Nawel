import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sanitizeText } from "@/lib/sanitize";
import { searchEventsWithSpellcheck } from "@/features/sortie/lib/search-events";
import type { EventProviderName, UnifiedEventResult } from "@/features/sortie/lib/event-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recherche multi-sources agrégée (Ticketmaster + OpenAgenda + futures)
 * avec retry orthographique automatique quand la 1re passe ramène 0.
 *
 * Best-effort : tout cas d'erreur (réseau, clé manquante, payload
 * invalide) renvoie un tableau vide en HTTP 200 — l'UI affiche
 * "aucun résultat" plutôt qu'une erreur. Les erreurs internes des
 * providers sont remontées dans `failedSources` à des fins de debug.
 *
 * `correctedQuery` est non-null quand la 2e passe (sur l'orthographe
 * suggérée par Ticketmaster) a ramené au moins un résultat. L'UI
 * affiche alors "Résultats pour 'roland' (au lieu de 'rolland')".
 */

const inputSchema = z.object({
  query: z.string().min(3).max(200),
});

const CACHE_TTL_MS = 60_000;
const LIMIT_PER_SOURCE = 3;
const MAX_RESULTS = 6;

export type { UnifiedEventResult };

type CachedSearch = {
  ts: number;
  results: UnifiedEventResult[];
  failedSources: EventProviderName[];
  correctedQuery: string | null;
};

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

  const cleaned = sanitizeText(parsed.data.query, 200);
  if (cleaned.length < 3) {
    return NextResponse.json({ results: [], failedSources: [], correctedQuery: null });
  }

  const cacheKey = cleaned.toLowerCase();
  const cached = readCache(cacheKey);
  if (cached) {
    return NextResponse.json({
      results: cached.results,
      failedSources: cached.failedSources,
      correctedQuery: cached.correctedQuery,
    });
  }

  const { results, failedSources, correctedQuery } = await searchEventsWithSpellcheck(
    cleaned,
    LIMIT_PER_SOURCE
  );
  // Le total après dédoublonnage peut excéder LIMIT_PER_SOURCE puisque
  // chaque source a sa propre quote ; on tronque ici pour ne pas
  // surcharger l'autocomplete dans le wizard.
  const trimmed = results.slice(0, MAX_RESULTS);
  writeCache(cacheKey, { results: trimmed, failedSources, correctedQuery });
  return NextResponse.json({ results: trimmed, failedSources, correctedQuery });
}
