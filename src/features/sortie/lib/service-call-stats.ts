import { sql } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/lib/db";
import { serviceCallStats } from "@drizzle/sortie-schema";
import { logger } from "@/lib/logger";

export type ServiceName = "gemini" | "ticketmaster";
export type ServiceOutcome = "found" | "no_match" | "error";

/**
 * Convention des labels de source — pour les afficher proprement dans
 * le dashboard et garantir qu'on n'éclate pas le compteur entre des
 * variantes typographiques ("wizard_search" vs "wizard-search").
 *
 *   gemini       → "findEventDetails"
 *   ticketmaster → "wizard-search" | "spellcheck" | "parse-enrich"
 */
export type ServiceSource = "findEventDetails" | "wizard-search" | "spellcheck" | "parse-enrich";

/**
 * Schedule un upsert de compteur pour un service externe (Gemini,
 * Ticketmaster Discovery API…). Même contrat que `trackParseAttempt` :
 * non-bloquant, jamais d'exception remontée à l'appelant. En contexte
 * hors-request `after()` jette → fire-and-forget direct.
 */
export function trackServiceCall(
  service: ServiceName,
  source: ServiceSource,
  outcome: ServiceOutcome,
  errorMessage?: string
): void {
  const run = () => recordServiceCall(service, source, outcome, errorMessage).catch(() => {});
  try {
    after(run);
  } catch {
    void run();
  }
}

export async function recordServiceCall(
  service: ServiceName,
  source: ServiceSource,
  outcome: ServiceOutcome,
  errorMessage?: string
): Promise<void> {
  const isError = outcome === "error";
  const isFound = outcome === "found";
  const trimmedMessage = errorMessage ? errorMessage.slice(0, 200) : null;

  try {
    await db
      .insert(serviceCallStats)
      .values({
        service,
        source,
        callCount: 1,
        foundCount: isFound ? 1 : 0,
        errorCount: isError ? 1 : 0,
        lastCalledAt: new Date(),
        lastErrorAt: isError ? new Date() : null,
        lastErrorMessage: isError ? trimmedMessage : null,
      })
      .onConflictDoUpdate({
        target: [serviceCallStats.service, serviceCallStats.source],
        set: {
          callCount: sql`${serviceCallStats.callCount} + 1`,
          foundCount: isFound
            ? sql`${serviceCallStats.foundCount} + 1`
            : sql`${serviceCallStats.foundCount}`,
          errorCount: isError
            ? sql`${serviceCallStats.errorCount} + 1`
            : sql`${serviceCallStats.errorCount}`,
          lastCalledAt: sql`now()`,
          // On ne nettoie pas lastErrorAt/Message en cas de succès :
          // le dashboard veut savoir "quel a été le dernier pépin",
          // pas "y a-t-il un pépin en cours".
          lastErrorAt: isError ? sql`now()` : sql`${serviceCallStats.lastErrorAt}`,
          lastErrorMessage: isError ? trimmedMessage : sql`${serviceCallStats.lastErrorMessage}`,
          updatedAt: sql`now()`,
        },
      });
  } catch (err) {
    logger.warn("[service-call-stats] upsert failed", {
      service,
      source,
      outcome,
      message: err instanceof Error ? err.message : "unknown",
    });
  }
}
