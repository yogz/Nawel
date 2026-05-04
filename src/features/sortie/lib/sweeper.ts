/**
 * Scheduled transitions for Sortie outings. A single pass handles three
 * independent state changes — kept in one function so the cron tick is
 * cheap (one round-trip per phase) and the order is explicit.
 *
 * Idempotency guarantees:
 *   - `open → awaiting_purchase` is driven by a WHERE clause that won't
 *     match a second time (status check).
 *   - J-1 reminder writes `reminder_j1_sent_at` *before* sending, so a
 *     mid-batch crash never re-emails the same outing.
 *   - `awaiting_purchase → past` is also status-guarded.
 *
 * Emails sent here are best-effort — one bad recipient shouldn't stop the
 * whole batch. `safeSend` in `send-outing-emails.ts` swallows per-recipient
 * failures; outing-level failures bubble up to the route so the cron
 * response reports them.
 */

import { and, eq, inArray, isNotNull, isNull, lte, notExists, or, sql } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { outings, outingTimeslots, purchases, tickets } from "@drizzle/sortie-schema";
import { isOurBlobUrl } from "@/features/sortie/lib/blob-cleanup";
import { TICKET_PATH_PREFIX } from "@/features/sortie/lib/ticket-upload";
import {
  sendJ1ReminderEmails,
  sendRsvpClosedEmails,
} from "@/features/sortie/lib/emails/send-outing-emails";

// Plafond par phase. Permet au tick de finir dans le maxDuration de la
// route même si une migration laisse 50k outings en bascule. Au-delà, le
// tick suivant reprend les restantes (toutes les transitions sont
// status-guardées et donc idempotentes par lot).
const SWEEPER_BATCH_LIMIT = 500;

// Scope du `pg_try_advisory_lock` posé par la phase 4. Une constante
// pour garantir que lock et unlock parlent du même hash — un drift
// silencieux ferait fuiter le lock jusqu'à la fin de session.
const TICKET_CLEANUP_LOCK_SCOPE = "sortie:ticket-cleanup";

export type SweeperReport = {
  closedRsvps: number;
  j1Reminders: number;
  markedPast: number;
  ticketsCleanedUp: number;
  /** True quand un autre tick concurrent tient l'advisory lock — pas une
   * erreur, juste un skip attendu. Séparé de `errors` pour que les
   * dashboards qui watch `errors.length > 0` ne s'allument pas. */
  ticketCleanupSkipped: boolean;
  errors: string[];
};

const TICKET_RETENTION_DAYS = 30;

/**
 * Runs the full sweep. Accepts a clock-override for tests — prod calls it
 * with `new Date()`.
 */
export async function runSortieSweeper(now: Date = new Date()): Promise<SweeperReport> {
  const report: SweeperReport = {
    closedRsvps: 0,
    j1Reminders: 0,
    markedPast: 0,
    ticketsCleanedUp: 0,
    ticketCleanupSkipped: false,
    errors: [],
  };

  // --- 1. Close RSVPs whose deadline just crossed. --------------------------
  const closing = await db.query.outings.findMany({
    where: and(eq(outings.status, "open"), lte(outings.deadlineAt, now)),
    columns: {
      id: true,
      title: true,
      slug: true,
      shortId: true,
      fixedDatetime: true,
      location: true,
      // Lus pour différencier le mail rsvp-closed entre une sortie datée
      // (mode=fixed ou vote-déjà-tranché) et un sondage non tranché — le
      // template adapte la ligne « rendez-vous… ».
      mode: true,
      chosenTimeslotId: true,
    },
    limit: SWEEPER_BATCH_LIMIT,
  });

  for (const outing of closing) {
    // Guard the write with the same status check so two overlapping cron
    // runs can't both see `open` and both notify.
    const flipped = await db
      .update(outings)
      .set({
        status: "awaiting_purchase",
        updatedAt: now,
        // Bump SEQUENCE pour que les abonnés au flux iCal voient la
        // transition (TRANSP / suffixe SUMMARY changent en
        // conséquence). RFC 5545 §3.8.7.4.
        sequence: sql`${outings.sequence} + 1`,
      })
      .where(and(eq(outings.id, outing.id), eq(outings.status, "open")))
      .returning({ id: outings.id });
    if (flipped.length === 0) {
      continue;
    }
    try {
      await sendRsvpClosedEmails({ outing });
      report.closedRsvps += 1;
    } catch (err) {
      report.errors.push(`close:${outing.shortId}:${(err as Error).message}`);
    }
  }

  // --- 2. J-1 reminders for outings happening in the next ~48h. -------------
  // Vercel Hobby caps crons at daily, so the tick fires once every 24h. We
  // widen the window to [now, now+48h] so that whichever morning tick first
  // sees an outing within 2 days sends the reminder; the stamp then prevents
  // a second send the next morning. Net effect: confirmed attendees get a
  // heads-up 24h–48h before their event, never after.
  const reminderLo = now;
  const reminderHi = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const reminding = await db.query.outings.findMany({
    where: and(
      isNull(outings.reminderJ1SentAt),
      sql`${outings.status} in ('open','awaiting_purchase','purchased')`,
      sql`${outings.fixedDatetime} is not null`,
      sql`${outings.fixedDatetime} >= ${reminderLo.toISOString()}`,
      sql`${outings.fixedDatetime} <= ${reminderHi.toISOString()}`
    ),
    columns: {
      id: true,
      title: true,
      slug: true,
      shortId: true,
      fixedDatetime: true,
      location: true,
    },
    limit: SWEEPER_BATCH_LIMIT,
  });

  for (const outing of reminding) {
    // Stamp FIRST so a crash mid-email can't re-fire next tick. The cost of
    // a stamped-but-unsent reminder is one missed J-1; the cost of an
    // un-stamped double-send is annoying users. We'd rather miss than spam.
    const stamped = await db
      .update(outings)
      .set({ reminderJ1SentAt: now })
      .where(and(eq(outings.id, outing.id), isNull(outings.reminderJ1SentAt)))
      .returning({ id: outings.id });
    if (stamped.length === 0 || outing.fixedDatetime === null) {
      continue;
    }
    try {
      await sendJ1ReminderEmails({
        outing: {
          id: outing.id,
          title: outing.title,
          slug: outing.slug,
          shortId: outing.shortId,
          fixedDatetime: outing.fixedDatetime,
          location: outing.location,
        },
      });
      report.j1Reminders += 1;
    } catch (err) {
      report.errors.push(`j1:${outing.shortId}:${(err as Error).message}`);
    }
  }

  // --- 3. Mark outings "past" once the event is 24h+ in the rear view. ------
  // An outing sits in awaiting_purchase only until someone declares the
  // tickets. If 24h post-event nobody has, we flip to "past" so the UI can
  // stop begging for a purchase declaration. Outings with an actual purchase
  // row are left alone — those belong in the money-flow funnel.
  const pastCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Anti-join NOT EXISTS — un round-trip au lieu de N+1 sur purchases.
  // Outings qui ont une purchase associée vivent leur propre cycle
  // (settled / stale_purchase) via le money-flow path : on les exclut
  // directement dans la query plutôt que de les charger pour les filtrer.
  const candidates = await db
    .select({ id: outings.id, shortId: outings.shortId })
    .from(outings)
    .where(
      and(
        sql`${outings.status} in ('open','awaiting_purchase')`,
        sql`${outings.fixedDatetime} is not null`,
        sql`${outings.fixedDatetime} <= ${pastCutoff.toISOString()}`,
        notExists(
          db
            .select({ one: sql`1` })
            .from(purchases)
            .where(eq(purchases.outingId, outings.id))
        )
      )
    )
    .limit(SWEEPER_BATCH_LIMIT);

  for (const candidate of candidates) {
    const flipped = await db
      .update(outings)
      .set({
        status: "past",
        updatedAt: now,
        sequence: sql`${outings.sequence} + 1`,
      })
      .where(
        and(eq(outings.id, candidate.id), sql`${outings.status} in ('open','awaiting_purchase')`)
      )
      .returning({ id: outings.id });
    if (flipped.length > 0) {
      report.markedPast += 1;
    }
  }

  await cleanupExpiredTickets(now, report);

  return report;
}

/**
 * Phase 4 du sweeper — hard-delete tickets row + blob pour les sorties
 * passées >30j et les orphelins déjà revoked. Le blob est illisible sans
 * `SORTIE_TICKET_KEY_*`, garder une row sans son blob n'a aucune valeur
 * audit. Quatre catégories ciblées :
 *   A. Sortie 'fixed' : fixedDatetime + 30j passé
 *   B. Sortie 'vote'  : chosenTimeslot.startsAt + 30j passé
 *   C. Sortie cancelled depuis + 30j (cas remboursement clos)
 *   D. Ticket revokedAt + 30j (orphelin laissé par revokeTicketAction
 *      qui garde intentionnellement le blob "pour rollback admin")
 *
 * Idempotence : Vercel peut delivery un cron event 2× (doc officielle
 * "occasionally deliver the same cron event more than once"). On pose
 * un advisory lock Postgres pour qu'une seconde invocation concurrente
 * skip ce job sans collision sur les mêmes IDs.
 */
async function cleanupExpiredTickets(now: Date, report: SweeperReport): Promise<void> {
  // postgres-js retourne un RowList qui est un array — pas d'enveloppe
  // `.rows`. On type le row attendu pour récupérer `locked` proprement.
  const lockResult = await db.execute<{ locked: boolean }>(
    sql`SELECT pg_try_advisory_lock(hashtext(${TICKET_CLEANUP_LOCK_SCOPE})) AS locked`
  );
  const acquired = lockResult[0]?.locked === true;
  if (!acquired) {
    report.ticketCleanupSkipped = true;
    return;
  }

  try {
    const ticketCutoff = new Date(now.getTime() - TICKET_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    let ticketsToDelete: { id: string; blobUrl: string | null }[] = [];
    try {
      ticketsToDelete = await db
        .select({ id: tickets.id, blobUrl: tickets.blobUrl })
        .from(tickets)
        // tickets.outingId est NOT NULL + FK : innerJoin permet au planner
        // de prendre une route hash/merge sans réserver le cas "ticket
        // sans outing" (impossible).
        .innerJoin(outings, eq(outings.id, tickets.outingId))
        // chosenTimeslotId est nullable → leftJoin obligatoire (sortie en
        // mode fixed n'a pas de timeslot).
        .leftJoin(outingTimeslots, eq(outingTimeslots.id, outings.chosenTimeslotId))
        .where(
          or(
            lte(outings.fixedDatetime, ticketCutoff),
            lte(outingTimeslots.startsAt, ticketCutoff),
            and(isNotNull(outings.cancelledAt), lte(outings.cancelledAt, ticketCutoff)),
            lte(tickets.revokedAt, ticketCutoff)
          )
        )
        .limit(SWEEPER_BATCH_LIMIT);
    } catch (err) {
      report.errors.push(`ticket-cleanup:select:${(err as Error).message}`);
      return;
    }

    if (ticketsToDelete.length === 0) {
      return;
    }

    // del(string[]) en 1 round-trip HTTP. Filtre paranoïaque sur le
    // host + path préfixe via `isOurBlobUrl` — pour ne pas toucher
    // un blob d'un autre service si une row a été corrompue.
    const blobUrls = ticketsToDelete
      .map((t) => t.blobUrl)
      .filter((u): u is string => isOurBlobUrl(u, TICKET_PATH_PREFIX));
    try {
      if (blobUrls.length > 0) {
        await del(blobUrls);
      }
    } catch (err) {
      // Best-effort : on log et on continue avec le delete DB. Les
      // blobs non supprimés deviennent orphelins (illisibles) et
      // pourront être ramassés par un audit ultérieur. Sans ça, un
      // glitch Vercel Blob bloquerait tout le cleanup.
      report.errors.push(`ticket-cleanup:blob-batch:${(err as Error).message}`);
    }

    // Si le DELETE throw, le tick suivant reprendra les mêmes IDs
    // (les blobs étant déjà supprimés, del() retentera 404-safe —
    // Vercel Blob ignore les URLs qui n'existent plus).
    try {
      const ids = ticketsToDelete.map((t) => t.id);
      const deleted = await db
        .delete(tickets)
        .where(inArray(tickets.id, ids))
        .returning({ id: tickets.id });
      report.ticketsCleanedUp += deleted.length;
    } catch (err) {
      report.errors.push(`ticket-cleanup:db-batch:${(err as Error).message}`);
    }
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(hashtext(${TICKET_CLEANUP_LOCK_SCOPE}))`);
  }
}
