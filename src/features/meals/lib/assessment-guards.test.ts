import { describe, it, expect } from "vitest";
import {
  isPastDate,
  shouldSkipAssessment,
  selectDueMealIds,
  QUIET_WINDOW_MS,
  type DueMeal,
} from "./assessment-guards";

describe("isPastDate", () => {
  it("is true for a date strictly before today", () => {
    expect(isPastDate("2026-06-17", "2026-06-18")).toBe(true);
  });

  it("is false for today or a future date", () => {
    expect(isPastDate("2026-06-18", "2026-06-18")).toBe(false);
    expect(isPastDate("2026-06-19", "2026-06-18")).toBe(false);
  });

  it("treats non-date values (e.g. 'common') as never past", () => {
    expect(isPastDate("common", "2026-06-18")).toBe(false);
    expect(isPastDate("", "2026-06-18")).toBe(false);
  });
});

describe("shouldSkipAssessment", () => {
  const base = { totalItems: 3, adults: 8, children: 2, isPast: false };

  it("does not skip a normal, future, populated meal with guests", () => {
    expect(shouldSkipAssessment(base)).toBe(false);
  });

  it("skips when there are no items", () => {
    expect(shouldSkipAssessment({ ...base, totalItems: 0 })).toBe(true);
  });

  it("skips when there is no headcount", () => {
    expect(shouldSkipAssessment({ ...base, adults: 0, children: 0 })).toBe(true);
  });

  it("skips when the meal is in the past", () => {
    expect(shouldSkipAssessment({ ...base, isPast: true })).toBe(true);
  });
});

describe("selectDueMealIds", () => {
  const now = new Date("2026-06-18T12:00:00Z");
  const settled = new Date(now.getTime() - QUIET_WINDOW_MS - 1000); // >10min ago
  const recent = new Date(now.getTime() - 60 * 1000); // 1min ago

  function meal(over: Partial<DueMeal> = {}): DueMeal {
    return {
      id: 1,
      itemsChangedAt: null,
      assessmentComputedAt: null,
      assessment: null,
      hasItems: true,
      ...over,
    };
  }

  it("selects a never-assessed meal with items (existing events)", () => {
    expect(selectDueMealIds([meal()], now)).toEqual([1]);
  });

  it("ignores a never-assessed meal that has no items", () => {
    expect(selectDueMealIds([meal({ hasItems: false })], now)).toEqual([]);
  });

  it("unsticks a meal claimed but left blank by a failed attempt", () => {
    expect(
      selectDueMealIds([meal({ assessmentComputedAt: settled, assessment: null })], now)
    ).toEqual([1]);
  });

  it("skips a meal that already has an assessment and no new edit", () => {
    expect(
      selectDueMealIds([meal({ assessmentComputedAt: settled, assessment: "{}" })], now)
    ).toEqual([]);
  });

  it("ignores meals still inside the quiet window", () => {
    expect(selectDueMealIds([meal({ itemsChangedAt: recent })], now)).toEqual([]);
  });

  it("selects a settled meal edited after its last computation", () => {
    const computedBefore = new Date(settled.getTime() - 1000);
    expect(
      selectDueMealIds(
        [meal({ itemsChangedAt: settled, assessmentComputedAt: computedBefore, assessment: "{}" })],
        now
      )
    ).toEqual([1]);
  });

  it("skips a meal already computed after its latest edit", () => {
    const computedAfter = new Date(settled.getTime() + 1000);
    expect(
      selectDueMealIds(
        [meal({ itemsChangedAt: settled, assessmentComputedAt: computedAfter, assessment: "{}" })],
        now
      )
    ).toEqual([]);
  });
});
