/**
 * Pure cost-guard helpers for the assessment processor, kept free of any
 * server-only imports so they can be unit-tested.
 */

// Consider a meal "settled" once it hasn't changed for this long.
export const QUIET_WINDOW_MS = 10 * 60 * 1000;

/** A meal date in the past (relative to `todayStr`, "YYYY-MM-DD"). */
export function isPastDate(date: string, todayStr: string): boolean {
  // "common" meals (vacation shared items) have no real date — never "past".
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date < todayStr;
}

/** Whether a meal has nothing worth spending an AI call on. */
export function shouldSkipAssessment(args: {
  totalItems: number;
  adults: number;
  children: number;
  isPast: boolean;
}): boolean {
  return args.totalItems === 0 || args.adults + args.children === 0 || args.isPast;
}

export interface DueMeal {
  id: number;
  itemsChangedAt: Date | null;
  assessmentComputedAt: Date | null;
  /** Raw stored assessment JSON (null = none/failed/never computed). */
  assessment: string | null;
  hasItems: boolean;
}

/**
 * Among the given meals, the ids that are "due" for (re)assessment. A meal is
 * due when it has settled (no edit within the quiet window) AND either:
 * - it has items but no stored assessment yet (covers events predating the
 *   feature, and meals left blank by a previous failed attempt), or
 * - it was edited after its last assessment (stale).
 * A meal that already has an assessment (even `sufficient`) and no new edit is
 * not re-computed; an empty meal never triggers an AI call. Pure so it can run
 * at request time off `fetchPlan` data (no DB query).
 */
export function selectDueMealIds(meals: DueMeal[], now: Date): number[] {
  const cutoff = now.getTime() - QUIET_WINDOW_MS;
  return meals
    .filter((meal) => {
      const changedAt = meal.itemsChangedAt;
      const computedAt = meal.assessmentComputedAt;
      const editedSinceCompute =
        changedAt !== null && (computedAt === null || computedAt.getTime() < changedAt.getTime());
      const needsCompute = (meal.assessment === null && meal.hasItems) || editedSinceCompute;
      const settled = changedAt === null || changedAt.getTime() <= cutoff;
      return needsCompute && settled;
    })
    .map((meal) => meal.id);
}
