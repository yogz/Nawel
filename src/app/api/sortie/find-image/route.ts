import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { findEventImage, type FindImageResult } from "@/lib/gemini-image-search";
import { incrementGeminiUsage } from "@/features/sortie/lib/event-lookup-cache";
import { getClientIp, rateLimit } from "@/features/sortie/lib/rate-limit";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recherche dédiée d'UNE image illustrative pour un événement existant.
 * Use-case : bouton "Rechercher une autre image" du `MissingImagePicker`
 * sur la page Modifier (titre + venue + vibe déjà connus côté DB,
 * l'utilisateur ne veut qu'une nouvelle image).
 *
 * Différent de `/api/sortie/find-event` qui cherche TOUT l'évent
 * (titre, lieu, date, billetterie, image, vibe) — beaucoup plus strict
 * sur le matching et tombe en `low_confidence` quand l'évent n'a pas de
 * source officielle dans Google. Ici, le prompt autorise les images
 * génériques pour TOUJOURS retourner quelque chose d'utile.
 *
 * Garde-fous :
 * - Rate-limit 10 lookups / heure / IP
 * - Cache Redis 7 jours sur (title + venue + vibe) pour ne pas re-payer
 *   Gemini quand l'utilisateur clique deux fois "Rechercher" sur le même
 *   évent (le bouton normal). Bypass via `noCache: true` côté client.
 * - Compteur quotidien `ai_usage_daily` pour tracker la conso (cap free
 *   tier ~1500 req/jour partagé avec find-event).
 */

const inputSchema = z.object({
  title: z.string().min(3).max(200),
  venue: z.string().max(100).optional(),
  vibe: z.string().max(20).optional(),
  noCache: z.boolean().optional(),
});

const CACHE_PREFIX = "sortie:find-image:";
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ found: false, reason: "bad_request" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ found: false, reason: "bad_request" }, { status: 400 });
  }
  const { title, venue, vibe, noCache } = parsed.data;

  const ip = await getClientIp();
  const gate = await rateLimit({
    key: `find-image:${ip}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { found: false, reason: "rate_limited", message: gate.message },
      { status: 429 }
    );
  }

  const cacheKey = buildCacheKey({ title, venue, vibe });

  if (!noCache && redis) {
    try {
      // Upstash auto-désérialise les valeurs JSON stockées via `set`.
      // Cast safe : on ne lit que ce qu'on a écrit nous-mêmes.
      const cached = await redis.get<FindImageResult>(cacheKey);
      if (cached) {
        logger.debug("[find-image] cache hit", { cacheKey });
        return NextResponse.json(cached);
      }
    } catch (err) {
      // Cache fail-open : si Redis est down, on tape Gemini directement.
      logger.warn("[find-image] cache read failed, continuing", { err });
    }
  }

  const result = await findEventImage({ title, venue, vibe });
  // Compte tout appel à Gemini, qu'il aboutisse ou non — c'est ce qui
  // consomme du quota côté Google AI Studio.
  await incrementGeminiUsage();

  // Cache les "no_match" / "unreachable" aussi : ça évite de retaper
  // Gemini sur les mêmes queries fantaisistes / impossibles toutes les
  // 5 secondes. TTL 7 jours dans tous les cas.
  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(result), {
        ex: CACHE_TTL_SECONDS,
      });
    } catch (err) {
      logger.warn("[find-image] cache write failed", { err });
    }
  }

  return NextResponse.json(result);
}

function buildCacheKey(args: { title: string; venue?: string; vibe?: string }): string {
  const normalized = [args.title, args.venue ?? "", args.vibe ?? ""]
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 16);
  return `${CACHE_PREFIX}${hash}`;
}
