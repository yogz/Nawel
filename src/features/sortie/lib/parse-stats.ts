import { sql } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/lib/db";
import { parseStats } from "@drizzle/sortie-schema";
import { logger } from "@/lib/logger";

export type ParseOutcome = "success" | "zero_data" | "fetch_error" | "blocked_waf";

/**
 * Schedule un upsert télémétrie pour qu'il s'exécute après la réponse
 * HTTP. Sûr à appeler depuis un Route Handler ; en contexte hors-request
 * (tests vitest, scripts) `after()` jette — on retombe sur un
 * fire-and-forget direct, et on avale toute erreur d'exécution.
 *
 * Le contrat : cet appel ne bloque ni ne fait échouer l'appelant.
 */
export function trackParseAttempt(
  rawHost: string,
  outcome: ParseOutcome,
  rawPath: string | null
): void {
  const run = () => recordParseStat(rawHost, outcome, rawPath).catch(() => {});
  try {
    after(run);
  } catch {
    void run();
  }
}

/**
 * Normalise un hostname pour la clé de la table : lowercase + strip `www.`.
 * Renvoie null si le host est invalide (vide, IP, etc.) — l'appelant
 * skippe l'enregistrement plutôt que de saler la table.
 */
export function normalizeHost(rawHost: string): string | null {
  const lower = rawHost
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  if (!lower || lower.length > 253) {
    return null;
  }
  // Pas de tracking pour les IPs littérales — pas d'intérêt analytique
  // et ça évite de stocker des sondages SSRF dans la table.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lower) || lower.includes(":")) {
    return null;
  }
  return lower;
}

/**
 * Tronque un path à 200 chars et strippe la query string. Utilisé pour
 * `lastFailurePath` — on garde juste un indice utile pour reproduire
 * le bug, sans risque de stocker un token de partage en clair.
 */
function sanitizePath(rawPath: string): string {
  const noQuery = rawPath.split("?")[0] ?? "";
  return noQuery.slice(0, 200);
}

/**
 * Upsert atomique d'une stat de parsing pour un hostname. Best-effort :
 * une erreur DB est loggée et avalée — le tracking ne doit jamais
 * casser le flux user-facing du parsing d'URL.
 *
 * À appeler via `after()` côté route handler pour ne pas peser sur la
 * latence de la response.
 */
export async function recordParseStat(
  rawHost: string,
  outcome: ParseOutcome,
  rawPath: string | null
): Promise<void> {
  const host = normalizeHost(rawHost);
  if (!host) {
    return;
  }

  try {
    if (outcome === "success") {
      // Success → on incrémente juste `attempts`. Pas de timestamp ni
      // de path : le ratio (attempts - failures) / attempts donne le
      // taux de succès, on n'a pas besoin de plus.
      await db
        .insert(parseStats)
        .values({ host, attempts: 1 })
        .onConflictDoUpdate({
          target: parseStats.host,
          set: {
            attempts: sql`${parseStats.attempts} + 1`,
            updatedAt: sql`now()`,
          },
        });
      return;
    }

    const path = rawPath ? sanitizePath(rawPath) : null;
    // `blocked_waf` est compté dans `fetchErrorCount` côté DB (pas de
    // colonne dédiée — la nuance se voit via `lastFailureKind`). Comme
    // ça on n'a pas à migrer le schema à chaque nouveau type d'échec,
    // et le compteur "fetchErrors" reste l'agrégat utile pour repérer
    // les hosts qui posent problème.
    const isZeroData = outcome === "zero_data";
    await db
      .insert(parseStats)
      .values({
        host,
        attempts: 1,
        zeroDataCount: isZeroData ? 1 : 0,
        fetchErrorCount: isZeroData ? 0 : 1,
        lastFailureAt: new Date(),
        lastFailurePath: path,
        lastFailureKind: outcome,
      })
      .onConflictDoUpdate({
        target: parseStats.host,
        set: {
          attempts: sql`${parseStats.attempts} + 1`,
          zeroDataCount: isZeroData
            ? sql`${parseStats.zeroDataCount} + 1`
            : sql`${parseStats.zeroDataCount}`,
          fetchErrorCount: isZeroData
            ? sql`${parseStats.fetchErrorCount}`
            : sql`${parseStats.fetchErrorCount} + 1`,
          lastFailureAt: sql`now()`,
          lastFailurePath: path,
          lastFailureKind: outcome,
          updatedAt: sql`now()`,
        },
      });
  } catch (err) {
    logger.warn("[parse-stats] upsert failed", {
      host,
      outcome,
      message: err instanceof Error ? err.message : "unknown",
    });
  }
}
