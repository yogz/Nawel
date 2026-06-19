import "server-only";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { meals, events } from "@drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { computeAssessmentInputHash, ASSESSMENT_VERSION } from "@/lib/meal-assessment-hash";
import { generateMealAssessment, type MealAssessmentInput } from "@/lib/meal-assessment";
import { isPastDate, shouldSkipAssessment } from "./assessment-guards";
import { logger } from "@/lib/logger";

const DEFAULT_CAP = 5;

export interface AssessmentProcessReport {
  claimed: number;
  assessed: number;
  cleared: number;
  hashUnchanged: number;
  failed: number;
}

/**
 * (Re)computes the "what's missing" assessment for the given meals, off the
 * request path (invoked via Next.js `after()` when an event page is viewed).
 *
 * Each meal is claimed with a single atomic UPDATE that also enforces the
 * 10-minute quiet window and staleness check, so concurrent page views never
 * double-compute the same meal (no advisory lock needed).
 */
export async function processDueMealAssessments(
  mealIds: number[],
  opts?: { cap?: number }
): Promise<AssessmentProcessReport> {
  const report: AssessmentProcessReport = {
    claimed: 0,
    assessed: 0,
    cleared: 0,
    hashUnchanged: 0,
    failed: 0,
  };

  const cap = opts?.cap ?? DEFAULT_CAP;
  const todayStr = new Date().toISOString().slice(0, 10);

  for (const mealId of mealIds.slice(0, cap)) {
    try {
      // Atomic claim: marks the meal processed AND re-checks quiet-window +
      // staleness. Empty result → not due, or another request already claimed it.
      const claimed = await db.execute<{ id: number }>(
        sql`UPDATE meals SET assessment_computed_at = now()
            WHERE id = ${mealId}
              AND (items_changed_at IS NULL OR items_changed_at <= now() - interval '10 minutes')
              AND (
                (EXISTS (SELECT 1 FROM services s JOIN items i ON i.service_id = s.id
                         WHERE s.meal_id = meals.id)
                  AND (assessment IS NULL
                       OR assessment_input_hash IS NULL
                       OR assessment_input_hash NOT LIKE ${ASSESSMENT_VERSION + ":%"}))
                OR (items_changed_at IS NOT NULL
                    AND (assessment_computed_at IS NULL OR assessment_computed_at < items_changed_at))
              )
            RETURNING id`
      );
      if (claimed.length === 0) {
        continue;
      }
      report.claimed += 1;

      const meal = await db.query.meals.findFirst({
        where: eq(meals.id, mealId),
        with: {
          services: { with: { items: { with: { person: true } } } },
        },
      });
      if (!meal) {
        continue;
      }

      const [event] = await db
        .select({
          slug: events.slug,
          locale: events.locale,
          adults: events.adults,
          children: events.children,
        })
        .from(events)
        .where(eq(events.id, meal.eventId));
      if (!event) {
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
      if (
        shouldSkipAssessment({
          totalItems,
          adults,
          children,
          isPast: isPastDate(meal.date, todayStr),
        })
      ) {
        // Nothing meaningful to suggest — clear any stale assessment so the
        // banner disappears (the claim already bumped assessment_computed_at).
        await db
          .update(meals)
          .set({ assessment: null, assessmentInputHash: null })
          .where(eq(meals.id, mealId));
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
        // Content identical to the last assessment — keep it (already bumped).
        report.hashUnchanged += 1;
        continue;
      }

      const input: MealAssessmentInput = {
        title: meal.title,
        date: meal.date,
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
        // AI failed — release the claim so a later visit retries instead of
        // leaving the meal stuck blank.
        await db.update(meals).set({ assessmentComputedAt: null }).where(eq(meals.id, mealId));
        report.failed += 1;
        continue;
      }

      await db
        .update(meals)
        .set({ assessment: JSON.stringify(assessment), assessmentInputHash: hash })
        .where(eq(meals.id, mealId));
      revalidatePath(`/event/${event.slug}`);
      report.assessed += 1;
    } catch (error) {
      logger.error("processDueMealAssessments failed for meal", mealId, error);
    }
  }

  return report;
}
