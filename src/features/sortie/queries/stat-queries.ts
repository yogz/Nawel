import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { outings, parseStats, participants, serviceCallStats } from "@drizzle/sortie-schema";

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
  source: string;
  callCount: number;
  foundCount: number;
  errorCount: number;
  lastCalledAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
};

export type ServiceCallGroup = {
  service: string;
  totalCalls: number;
  totalFound: number;
  totalErrors: number;
  lastCalledAt: Date | null;
  // Trié par callCount desc — la source la plus "consommatrice" en
  // premier, qui est aussi la plus intéressante pour l'œil supervision.
  sources: ServiceCallStat[];
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
 * Compteurs par service externe groupés par service (gemini,
 * ticketmaster), avec breakdown par source d'appel pour chaque service
 * (findEventDetails, wizard-search, spellcheck, parse-enrich, legacy).
 * Volume ~5-10 rows DB — agrégation entièrement côté JS, pas
 * d'optimisation SQL utile à ce stade.
 */
export async function getServiceCallStats(): Promise<ServiceCallGroup[]> {
  const rows = await db.select().from(serviceCallStats);

  const groups = new Map<string, ServiceCallGroup>();
  for (const r of rows) {
    let group = groups.get(r.service);
    if (!group) {
      group = {
        service: r.service,
        totalCalls: 0,
        totalFound: 0,
        totalErrors: 0,
        lastCalledAt: null,
        sources: [],
      };
      groups.set(r.service, group);
    }
    group.totalCalls += r.callCount;
    group.totalFound += r.foundCount;
    group.totalErrors += r.errorCount;
    if (
      r.lastCalledAt &&
      (!group.lastCalledAt || r.lastCalledAt.getTime() > group.lastCalledAt.getTime())
    ) {
      group.lastCalledAt = r.lastCalledAt;
    }
    group.sources.push({
      service: r.service,
      source: r.source,
      callCount: r.callCount,
      foundCount: r.foundCount,
      errorCount: r.errorCount,
      lastCalledAt: r.lastCalledAt,
      lastErrorAt: r.lastErrorAt,
      lastErrorMessage: r.lastErrorMessage,
    });
  }

  for (const group of groups.values()) {
    group.sources.sort((a, b) => b.callCount - a.callCount);
  }
  return Array.from(groups.values()).sort((a, b) => b.totalCalls - a.totalCalls);
}

export type OutingsPerDay = {
  // Date au format ISO YYYY-MM-DD (jour Paris). String côté SQL pour
  // éviter les surprises de fuseau au sérialise → désérialise React.
  day: string;
  totalCount: number;
  // Sortie non cancelled — utile pour distinguer "créées" de "encore
  // actives". Le cancelled est rare mais existe sur des sortie tests.
  activeCount: number;
};

/**
 * Sorties créées par jour sur les 7 derniers jours (incluant
 * aujourd'hui), bucketées en heure locale Paris pour matcher l'usage
 * réel des créateurs. Renvoie 7 lignes max — moins si aucune sortie
 * n'a été créée certains jours (le dashboard remplit les trous).
 *
 * Distinct de "actives" (cancelled_at IS NULL) pour avoir les deux
 * chiffres : combien de gens créent vs combien restent debout.
 *
 * Note : le `GROUP BY` répète l'expression complète au lieu de
 * pointer l'alias `day` — Postgres l'accepte des deux façons mais
 * Drizzle quotait l'alias d'une manière qui faisait planter PG en
 * prod ("column 'day' does not exist"). On évite la confusion.
 */
export async function getOutingsCreatedPerDay(): Promise<OutingsPerDay[]> {
  const dayExpr = sql<string>`to_char(date_trunc('day', ${outings.createdAt} AT TIME ZONE 'Europe/Paris'), 'YYYY-MM-DD')`;
  const rows = await db
    .select({
      day: dayExpr,
      totalCount: sql<number>`COUNT(*)::int`,
      activeCount: sql<number>`COUNT(*) FILTER (WHERE ${outings.cancelledAt} IS NULL)::int`,
    })
    .from(outings)
    .where(sql`${outings.createdAt} >= now() - interval '7 days'`)
    .groupBy(dayExpr)
    .orderBy(dayExpr);

  return rows;
}

export type CreatorActivation28d = {
  /** Créateurs uniques authentifiés ayant publié ≥1 sortie sur 28j. */
  totalCreators: number;
  /**
   * Créateurs uniques ayant reçu ≥1 RSVP de quelqu'un d'autre
   * (participant avec userId différent OU participant anonyme — un
   * anonyme avec le même cookie device que le créateur ne peut pas
   * RSVPer son propre outing : la contrainte unique
   * `sortie_participants_outing_cookie_unique` garantit qu'un cookie
   * n'apparaît qu'une fois par outing, et le créateur ne stocke pas
   * de row participant pour son propre outing). C'est le seuil d'activation
   * §9.2 du rapport audit : « le créateur voit le produit fonctionner ».
   */
  activatedCreators: number;
};

/**
 * KPI activation créateur défini dans `ANALYTICS_AUDIT.md` §9.2 :
 * un créateur est *activé* quand il a publié ≥1 sortie ET reçu ≥1 RSVP
 * d'une autre identité. Mesure long-terme : fenêtre fixe 28j (pas
 * couplée au range UI), parce qu'à 5 publish/sem le ratio sur 7j n'a
 * pas de stabilité statistique.
 *
 * Limitations volontaires :
 *   - Créateurs anonymes (`creator_user_id IS NULL`) exclus du
 *     dénominateur — les compter ferait baisser artificiellement le
 *     ratio (pas de cohorte, pas d'identification stable).
 *   - Outings cancelled inclus : un cancel après 1 RSVP reste un signal
 *     d'activation pour le créateur (le produit a fonctionné une fois).
 */
export async function getCreatorActivation28d(): Promise<CreatorActivation28d> {
  const [row] = await db
    .select({
      totalCreators: sql<number>`COUNT(DISTINCT ${outings.creatorUserId})::int`,
      activatedCreators: sql<number>`COUNT(DISTINCT ${outings.creatorUserId}) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM ${participants} p
          WHERE p.outing_id = ${outings.id}
          AND (p.user_id IS NULL OR p.user_id IS DISTINCT FROM ${outings.creatorUserId})
        )
      )::int`,
    })
    .from(outings)
    .where(
      sql`${outings.createdAt} >= now() - interval '28 days' AND ${outings.creatorUserId} IS NOT NULL`
    );

  return row ?? { totalCreators: 0, activatedCreators: 0 };
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
