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

import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { outings, purchases } from "@drizzle/sortie-schema";
import {
  sendJ1ReminderEmails,
  sendRsvpClosedEmails,
} from "@/features/sortie/lib/emails/send-outing-emails";

export type SweeperReport = {
  closedRsvps: number;
  j1Reminders: number;
  markedPast: number;
  errors: string[];
};

/**
 * Runs the full sweep. Accepts a clock-override for tests — prod calls it
 * with `new Date()`.
 */
export async function runSortieSweeper(now: Date = new Date()): Promise<SweeperReport> {
  const report: SweeperReport = {
    closedRsvps: 0,
    j1Reminders: 0,
    markedPast: 0,
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
    },
  });

  for (const outing of closing) {
    // Guard the write with the same status check so two overlapping cron
    // runs can't both see `open` and both notify.
    const flipped = await db
      .update(outings)
      .set({ status: "awaiting_purchase", updatedAt: now })
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

  const candidates = await db
    .select({ id: outings.id, shortId: outings.shortId })
    .from(outings)
    .where(
      and(
        sql`${outings.status} in ('open','awaiting_purchase')`,
        sql`${outings.fixedDatetime} is not null`,
        sql`${outings.fixedDatetime} <= ${pastCutoff.toISOString()}`
      )
    );

  for (const candidate of candidates) {
    // Skip if any purchase exists — those outings live in their own lifecycle
    // and will reach `settled` (or stale_purchase) via the money-flow path.
    const hasPurchase = await db.query.purchases.findFirst({
      where: eq(purchases.outingId, candidate.id),
      columns: { id: true },
    });
    if (hasPurchase) {
      continue;
    }
    const flipped = await db
      .update(outings)
      .set({ status: "past", updatedAt: now })
      .where(
        and(eq(outings.id, candidate.id), sql`${outings.status} in ('open','awaiting_purchase')`)
      )
      .returning({ id: outings.id });
    if (flipped.length > 0) {
      report.markedPast += 1;
    }
  }

  return report;
}
