import "server-only";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { meals, events } from "@drizzle/schema";
import { and, or, eq, lt, lte, isNull, isNotNull, asc, inArray, sql } from "drizzle-orm";
import { computeAssessmentInputHash } from "@/lib/meal-assessment-hash";
import { generateMealAssessment, type MealAssessmentInput } from "@/lib/meal-assessment";
import { isPastDate, shouldSkipAssessment } from "./assessment-guards";
import { logger } from "@/lib/logger";

// Consider a meal "settled" once it hasn't changed for this long.
const QUIET_WINDOW_MS = 10 * 60 * 1000;
// Bound per-tick work (and AI cost) — oldest meals drain over successive ticks.
const MAX_PER_TICK = 40;
const LOCK_SCOPE = "meals:assessment";

export interface AssessmentSweeperReport {
  lockSkipped: boolean;
  scanned: number;
  assessed: number;
  cleared: number;
  hashUnchanged: number;
  failed: number;
}

export async function runMealAssessmentSweeper(): Promise<AssessmentSweeperReport> {
  const report: AssessmentSweeperReport = {
    lockSkipped: false,
    scanned: 0,
    assessed: 0,
    cleared: 0,
    hashUnchanged: 0,
    failed: 0,
  };

  // Vercel may deliver a cron event more than once; an advisory lock makes a
  // concurrent tick skip instead of double-processing the same meals.
  const lockResult = await db.execute<{ locked: boolean }>(
    sql`SELECT pg_try_advisory_lock(hashtext(${LOCK_SCOPE})) AS locked`
  );
  if (lockResult[0]?.locked !== true) {
    report.lockSkipped = true;
    return report;
  }

  try {
    const cutoff = new Date(Date.now() - QUIET_WINDOW_MS);
    const todayStr = new Date().toISOString().slice(0, 10);

    const due = await db.query.meals.findMany({
      where: and(
        isNotNull(meals.itemsChangedAt),
        lte(meals.itemsChangedAt, cutoff),
        or(isNull(meals.assessmentComputedAt), lt(meals.assessmentComputedAt, meals.itemsChangedAt))
      ),
      orderBy: [asc(meals.itemsChangedAt)],
      limit: MAX_PER_TICK,
      with: {
        services: {
          with: {
            items: { with: { person: true } },
          },
        },
      },
    });

    report.scanned = due.length;
    if (due.length === 0) {
      return report;
    }

    const eventIds = [...new Set(due.map((m) => m.eventId))];
    const eventRows = await db
      .select({
        id: events.id,
        slug: events.slug,
        locale: events.locale,
        adults: events.adults,
        children: events.children,
      })
      .from(events)
      .where(inArray(events.id, eventIds));
    const eventById = new Map(eventRows.map((e) => [e.id, e]));

    const now = new Date();

    for (const meal of due) {
      const event = eventById.get(meal.eventId);
      if (!event) {
        // Orphan (shouldn't happen via FK) — mark processed and move on.
        await db.update(meals).set({ assessmentComputedAt: now }).where(eq(meals.id, meal.id));
        continue;
      }

      // Declared meal counts, falling back to the event-level counts.
      let adults = meal.adults;
      let children = meal.children;
      if (adults + children === 0) {
        adults = event.adults;
        children = event.children;
      }

      const totalItems = meal.services.reduce((sum, s) => sum + s.items.length, 0);
      const guardSkip = shouldSkipAssessment({
        totalItems,
        adults,
        children,
        isPast: isPastDate(meal.date, todayStr),
      });

      if (guardSkip) {
        // Nothing meaningful to suggest — clear any stale assessment so the
        // banner disappears, and mark processed.
        await db
          .update(meals)
          .set({ assessment: null, assessmentInputHash: null, assessmentComputedAt: now })
          .where(eq(meals.id, meal.id));
        report.cleared += 1;
        continue;
      }

      const hash = computeAssessmentInputHash({
        title: meal.title,
        adults,
        children,
        services: meal.services.map((s) => ({
          id: s.id,
          title: s.title,
          items: s.items.map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            personId: i.personId,
            serviceId: i.serviceId,
          })),
        })),
      });

      if (hash === meal.assessmentInputHash) {
        // Content is identical to the last assessment — bump the clock only.
        await db.update(meals).set({ assessmentComputedAt: now }).where(eq(meals.id, meal.id));
        report.hashUnchanged += 1;
        continue;
      }

      const input: MealAssessmentInput = {
        title: meal.title,
        adults,
        children,
        services: meal.services.map((s) => ({
          title: s.title,
          items: s.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            broughtBy: i.person?.name ?? null,
          })),
        })),
      };

      const assessment = await generateMealAssessment(input, event.locale);

      if (!assessment) {
        // AI failed — mark processed (don't hammer); a later edit re-triggers.
        await db.update(meals).set({ assessmentComputedAt: now }).where(eq(meals.id, meal.id));
        report.failed += 1;
        continue;
      }

      await db
        .update(meals)
        .set({
          assessment: JSON.stringify(assessment),
          assessmentInputHash: hash,
          assessmentComputedAt: now,
        })
        .where(eq(meals.id, meal.id));
      revalidatePath(`/event/${event.slug}`);
      report.assessed += 1;
    }

    return report;
  } catch (error) {
    logger.error("runMealAssessmentSweeper failed", error);
    throw error;
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(hashtext(${LOCK_SCOPE}))`);
  }
}
