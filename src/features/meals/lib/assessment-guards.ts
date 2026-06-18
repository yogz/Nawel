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
 * Among the given meals, the ids that are "due" for (re)assessment: edited,
 * settled for at least the quiet window, and stale vs the last computation.
 * Pure so it can run at request time off `fetchPlan` data (no DB query).
 */
export function selectDueMealIds(meals: DueMeal[], now: Date): number[] {
  const cutoff = now.getTime() - QUIET_WINDOW_MS;
  return meals
    .filter(
      (meal) =>
        meal.itemsChangedAt !== null &&
        meal.itemsChangedAt.getTime() <= cutoff &&
        (meal.assessmentComputedAt === null ||
          meal.assessmentComputedAt.getTime() < meal.itemsChangedAt.getTime())
    )
    .map((meal) => meal.id);
}
