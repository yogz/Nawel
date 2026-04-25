import { createHash } from "node:crypto";
import { eq, and, sql, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventLookupCache, aiUsageDaily } from "@/../drizzle/schema";
import { logger } from "@/lib/logger";
import type { FindEventResult } from "@/lib/gemini-search";

const CACHE_TTL_DAYS = 7;
const PROVIDER = "gemini-search";
const FREE_TIER_DAILY_LIMIT = 1500;
const WARN_THRESHOLD = 0.8;

/**
 * Normalise une query pour le cache : trim, lowercase, collapse spaces.
 * Deux queries différentes en surface ("Phoenix Paris " vs "phoenix paris")
 * partagent ainsi la même entrée de cache.
 */
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function hashQuery(query: string): string {
  return createHash("sha256").update(normalizeQuery(query)).digest("hex");
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Lit un résultat en cache si frais (< 7 jours).
 * Retourne null si miss ou expiré.
 */
export async function getCachedLookup(query: string): Promise<FindEventResult | null> {
  const queryHash = hashQuery(query);
  const ttlCutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

  try {
    const [row] = await db
      .select()
      .from(eventLookupCache)
      .where(eq(eventLookupCache.queryHash, queryHash))
      .limit(1);

    if (!row) {
      return null;
    }
    if (row.createdAt < ttlCutoff) {
      // Entrée trop vieille — on la laisse pourrir, le prochain putCachedLookup
      // l'écrasera via le UNIQUE conflict.
      return null;
    }

    return JSON.parse(row.payload) as FindEventResult;
  } catch (error) {
    logger.error("[event-cache] read failed", error);
    return null;
  }
}

/**
 * Stocke un résultat en cache. Upsert sur queryHash.
 * Les résultats `found: false` sont aussi cachés pour éviter de retaper
 * le même fake-event 50 fois.
 */
export async function putCachedLookup(
  query: string,
  result: FindEventResult,
  sourcesCount: number
): Promise<void> {
  const queryHash = hashQuery(query);
  const payload = JSON.stringify(result);

  try {
    await db
      .insert(eventLookupCache)
      .values({
        queryHash,
        query: query.slice(0, 1000),
        payload,
        sourcesCount,
      })
      .onConflictDoUpdate({
        target: eventLookupCache.queryHash,
        set: {
          payload,
          sourcesCount,
          createdAt: new Date(),
        },
      });
  } catch (error) {
    logger.error("[event-cache] write failed", error);
  }
}

/**
 * Incrémente le compteur quotidien d'appels Gemini (pour observabilité).
 * Émet un warn console à 80% du free tier (1200/1500).
 */
export async function incrementGeminiUsage(): Promise<void> {
  const date = todayKey();
  try {
    const [row] = await db
      .insert(aiUsageDaily)
      .values({ date, provider: PROVIDER, count: 1 })
      .onConflictDoUpdate({
        target: [aiUsageDaily.date, aiUsageDaily.provider],
        set: {
          count: sql`${aiUsageDaily.count} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (row && row.count >= FREE_TIER_DAILY_LIMIT * WARN_THRESHOLD) {
      logger.warn(
        `[gemini-search] usage at ${row.count}/${FREE_TIER_DAILY_LIMIT} for ${date} — approaching free tier cap`
      );
    }
  } catch (error) {
    // Une table d'usage indisponible ne doit pas bloquer l'appel produit.
    logger.error("[event-cache] usage counter failed", error);
  }
}

/**
 * Lit l'usage du jour (pour dashboard admin éventuel).
 */
export async function getTodayUsage(): Promise<number> {
  try {
    const [row] = await db
      .select()
      .from(aiUsageDaily)
      .where(and(eq(aiUsageDaily.date, todayKey()), eq(aiUsageDaily.provider, PROVIDER)))
      .limit(1);
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Purge les entrées de cache plus anciennes que TTL.
 * À appeler depuis un cron / admin tool, pas critique pour le runtime.
 */
export async function purgeStaleCache(): Promise<number> {
  const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
  try {
    const deleted = await db
      .delete(eventLookupCache)
      .where(lt(eventLookupCache.createdAt, cutoff))
      .returning({ id: eventLookupCache.id });
    return deleted.length;
  } catch (error) {
    logger.error("[event-cache] purge failed", error);
    return 0;
  }
}
