/**
 * Pure cost-guard helpers for the assessment sweeper, kept free of any
 * server-only imports so they can be unit-tested.
 */

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
