import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { findEventDetails } from "@/lib/gemini-search";
import {
  getCachedLookup,
  putCachedLookup,
  incrementGeminiUsage,
} from "@/features/sortie/lib/event-lookup-cache";
import { getClientIp, rateLimit } from "@/features/sortie/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fallback ultime du wizard de création : quand le parsing d'URL ET la
 * recherche Ticketmaster ont échoué, le client peut nous interroger ici
 * avec un nom d'événement brut. On invoque Gemini avec grounding pour
 * essayer de retrouver les détails (titre, salle, date, billetterie, image).
 *
 * Garde-fous :
 * - Rate-limit 10 lookups / heure / IP (via @/features/sortie/lib/rate-limit)
 * - Cache résultat 7 jours en DB (event_lookup_cache) — limite la conso
 *   du free tier Google AI Studio (~1500 req/jour)
 * - Compteur quotidien (ai_usage_daily) avec warn console à 80% du cap
 * - Aucune information d'authentification requise : la route accepte
 *   les utilisateurs anonymes du wizard. Le rate-limit IP est la seule
 *   barrière contre l'abus.
 */

const inputSchema = z.object({
  query: z.string().min(3).max(300),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ found: false, reason: "bad_request" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ found: false, reason: "too_short" }, { status: 400 });
  }
  const query = parsed.data.query.trim();

  const ip = await getClientIp();
  const gate = await rateLimit({
    key: `find-event:${ip}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { found: false, reason: "rate_limited", message: gate.message },
      { status: 429 }
    );
  }

  const cached = await getCachedLookup(query);
  if (cached) {
    logger.debug("[find-event] cache hit", { query });
    return NextResponse.json(cached);
  }

  const result = await findEventDetails(query);
  // On compte tout appel à Gemini, qu'il ait réussi ou non — c'est ce
  // qui consomme du quota.
  await incrementGeminiUsage();

  // On cache aussi les "not found" pour ne pas retaper indéfiniment
  // les mêmes queries fantaisistes. TTL 7 jours dans tous les cas.
  const sourcesCount = result.found ? result.sources.length : 0;
  await putCachedLookup(query, result, sourcesCount);

  return NextResponse.json(result);
}
