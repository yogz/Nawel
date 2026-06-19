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
}

/**
 * Among the given meals, the ids that are "due" for (re)assessment:
 * - never assessed yet → due immediately (covers events that predate the
 *   feature, whose `itemsChangedAt` is NULL), unless an edit is still settling;
 * - edited and stale → due once settled for the quiet window.
 * Pure so it can run at request time off `fetchPlan` data (no DB query).
 */
export function selectDueMealIds(meals: DueMeal[], now: Date): number[] {
  const cutoff = now.getTime() - QUIET_WINDOW_MS;
  return meals
    .filter((meal) => {
      const changedAt = meal.itemsChangedAt;
      const computedAt = meal.assessmentComputedAt;
      const stale =
        computedAt === null || (changedAt !== null && computedAt.getTime() < changedAt.getTime());
      const settled = changedAt === null || changedAt.getTime() <= cutoff;
      return stale && settled;
    })
    .map((meal) => meal.id);
}
