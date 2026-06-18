import { describe, it, expect } from "vitest";
import {
  isPastDate,
  shouldSkipAssessment,
  selectDueMealIds,
  QUIET_WINDOW_MS,
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

  it("ignores meals that were never edited", () => {
    expect(
      selectDueMealIds([{ id: 1, itemsChangedAt: null, assessmentComputedAt: null }], now)
    ).toEqual([]);
  });

  it("ignores meals still inside the quiet window", () => {
    expect(
      selectDueMealIds([{ id: 1, itemsChangedAt: recent, assessmentComputedAt: null }], now)
    ).toEqual([]);
  });

  it("selects a settled, never-computed meal", () => {
    expect(
      selectDueMealIds([{ id: 7, itemsChangedAt: settled, assessmentComputedAt: null }], now)
    ).toEqual([7]);
  });

  it("selects a settled meal whose last computation predates the latest edit", () => {
    const computedBefore = new Date(settled.getTime() - 1000);
    expect(
      selectDueMealIds(
        [{ id: 7, itemsChangedAt: settled, assessmentComputedAt: computedBefore }],
        now
      )
    ).toEqual([7]);
  });

  it("skips a meal already computed after its latest edit", () => {
    const computedAfter = new Date(settled.getTime() + 1000);
    expect(
      selectDueMealIds(
        [{ id: 7, itemsChangedAt: settled, assessmentComputedAt: computedAfter }],
        now
      )
    ).toEqual([]);
  });
});
