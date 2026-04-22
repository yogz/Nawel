import { describe, expect, it } from "vitest";
import { formatOutingDate, formatOutingDateConversational, formatOutingDateShort } from "./date-fr";

// 2026-12-12 20:30 Paris time — a winter date so we're on CET (UTC+1).
const SAMPLE = new Date("2026-12-12T19:30:00Z");

describe("date-fr formatters", () => {
  it("formatOutingDate produces 'jeudi 12 décembre · 20h30'", () => {
    expect(formatOutingDate(SAMPLE)).toBe("samedi 12 décembre · 20h30");
  });

  it("formatOutingDateShort produces 'sam. 12 déc. · 20h30'", () => {
    expect(formatOutingDateShort(SAMPLE)).toBe("sam. 12 déc. · 20h30");
  });

  it("formatOutingDateConversational produces '12 décembre à 20h30'", () => {
    expect(formatOutingDateConversational(SAMPLE)).toBe("12 décembre à 20h30");
  });
});
