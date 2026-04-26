import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { parseStats, serviceCallStats } from "@drizzle/sortie-schema";

export type ParseAggregate = {
  totalAttempts: number;
  totalSuccess: number;
  totalImageFound: number;
  totalZeroData: number;
  totalFetchError: number;
  hostCount: number;
};

export type ServiceCallStat = {
  service: string;
  callCount: number;
  foundCount: number;
  errorCount: number;
  lastCalledAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
};

export type HostStat = {
  host: string;
  attempts: number;
  successCount: number;
  imageFoundCount: number;
  zeroDataCount: number;
  fetchErrorCount: number;
  lastFailureAt: Date | null;
  lastFailurePath: string | null;
  lastFailureKind: string | null;
};

/**
 * Agrégats globaux du scraper OG sur tous les hosts. Une seule ligne
 * remontée — tout est calculé en SQL pour éviter de streamer toute la
 * table juste pour faire des sommes côté Node.
 */
export async function getParseAggregate(): Promise<ParseAggregate> {
  const [row] = await db
    .select({
      totalAttempts: sql<number>`COALESCE(SUM(${parseStats.attempts}), 0)::int`,
      totalSuccess: sql<number>`COALESCE(SUM(${parseStats.successCount}), 0)::int`,
      totalImageFound: sql<number>`COALESCE(SUM(${parseStats.imageFoundCount}), 0)::int`,
      totalZeroData: sql<number>`COALESCE(SUM(${parseStats.zeroDataCount}), 0)::int`,
      totalFetchError: sql<number>`COALESCE(SUM(${parseStats.fetchErrorCount}), 0)::int`,
      hostCount: sql<number>`COUNT(*)::int`,
    })
    .from(parseStats);

  return (
    row ?? {
      totalAttempts: 0,
      totalSuccess: 0,
      totalImageFound: 0,
      totalZeroData: 0,
      totalFetchError: 0,
      hostCount: 0,
    }
  );
}

/**
 * Compteurs par service externe (gemini, ticketmaster). Volume ~2-5
 * lignes — pas de tri SQL nécessaire, on tri côté JS pour mettre les
 * services les plus appelés en premier.
 */
export async function getServiceCallStats(): Promise<ServiceCallStat[]> {
  const rows = await db.select().from(serviceCallStats);
  return rows
    .map((r) => ({
      service: r.service,
      callCount: r.callCount,
      foundCount: r.foundCount,
      errorCount: r.errorCount,
      lastCalledAt: r.lastCalledAt,
      lastErrorAt: r.lastErrorAt,
      lastErrorMessage: r.lastErrorMessage,
    }))
    .sort((a, b) => b.callCount - a.callCount);
}

/**
 * Détail par host, top 50 par volume. Le dashboard les affiche dans
 * une table avec taux de succès / taux d'image / dernier échec.
 */
export async function getHostBreakdown(limit = 50): Promise<HostStat[]> {
  const rows = await db.select().from(parseStats).orderBy(desc(parseStats.attempts)).limit(limit);

  return rows.map((r) => ({
    host: r.host,
    attempts: r.attempts,
    successCount: r.successCount,
    imageFoundCount: r.imageFoundCount,
    zeroDataCount: r.zeroDataCount,
    fetchErrorCount: r.fetchErrorCount,
    lastFailureAt: r.lastFailureAt,
    lastFailurePath: r.lastFailurePath,
    lastFailureKind: r.lastFailureKind,
  }));
}
