import { describe, expect, it } from "vitest";
import {
  formatOutingDate,
  formatOutingDateConversational,
  formatOutingDateShort,
  parisCalendarDaysBetween,
} from "./date-fr";

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

describe("parisCalendarDaysBetween", () => {
  it("compte les minuits Paris franchis, pas les tranches de 24h", () => {
    // Mardi 23h → mercredi 8h Paris : 9h d'écart mais 1 jour calendaire.
    expect(
      parisCalendarDaysBetween(
        new Date("2026-11-03T23:00:00+01:00"),
        new Date("2026-11-04T08:00:00+01:00")
      )
    ).toBe(1);
  });

  it("vaut 0 le même jour Paris, même quand la date UTC diffère", () => {
    // 00h30 Paris = 23h30 UTC la veille.
    expect(
      parisCalendarDaysBetween(
        new Date("2026-11-04T00:30:00+01:00"),
        new Date("2026-11-04T21:00:00+01:00")
      )
    ).toBe(0);
  });

  it("reste juste à travers un changement d'heure", () => {
    // Passage à l'heure d'hiver le 25 octobre 2026.
    expect(
      parisCalendarDaysBetween(
        new Date("2026-10-21T09:00:00+02:00"),
        new Date("2026-10-28T20:00:00+01:00")
      )
    ).toBe(7);
  });
});
