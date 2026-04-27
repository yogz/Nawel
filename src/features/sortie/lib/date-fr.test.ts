import { describe, expect, it } from "vitest";
import { formatOutingDate, formatOutingDateConversational, formatOutingDateShort } from "./date-fr";

// 2026-12-12 20:30 Paris time — a winter date so we're on CET (UTC+1).
const SAMPLE = new Date("2026-12-12T19:30:00Z");
// Pin "now" so les tests sont deterministes vis-à-vis du `yearSuffixIfNeeded`.
const NOW_SAME_YEAR = new Date("2026-04-28T10:00:00Z");
const NOW_NEXT_YEAR = new Date("2027-04-28T10:00:00Z");

describe("date-fr formatters", () => {
  it("formatOutingDate produces 'samedi 12 décembre · 20h30' sans année quand même année", () => {
    expect(formatOutingDate(SAMPLE, NOW_SAME_YEAR)).toBe("samedi 12 décembre · 20h30");
  });

  it("formatOutingDate ajoute l'année quand différente", () => {
    expect(formatOutingDate(SAMPLE, NOW_NEXT_YEAR)).toBe("samedi 12 décembre 2026 · 20h30");
  });

  it("formatOutingDateShort produces 'sam. 12 déc. · 20h30' sans année quand même année", () => {
    expect(formatOutingDateShort(SAMPLE, NOW_SAME_YEAR)).toBe("sam. 12 déc. · 20h30");
  });

  it("formatOutingDateShort ajoute l'année quand différente", () => {
    expect(formatOutingDateShort(SAMPLE, NOW_NEXT_YEAR)).toBe("sam. 12 déc. 2026 · 20h30");
  });

  it("formatOutingDateConversational produces '12 décembre à 20h30' sans année quand même année", () => {
    expect(formatOutingDateConversational(SAMPLE, NOW_SAME_YEAR)).toBe("12 décembre à 20h30");
  });

  it("formatOutingDateConversational ajoute l'année quand différente", () => {
    expect(formatOutingDateConversational(SAMPLE, NOW_NEXT_YEAR)).toBe("12 décembre 2026 à 20h30");
  });
});
