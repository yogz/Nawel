import { describe, it, expect } from "vitest";
import { isPastDate, shouldSkipAssessment } from "./assessment-guards";

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
