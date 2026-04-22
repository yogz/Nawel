import { describe, expect, it } from "vitest";
import { numberToFrench, numberToFrenchCap } from "./number-fr";

describe("numberToFrench", () => {
  it("spells 0-19 in words", () => {
    expect(numberToFrench(0)).toBe("zéro");
    expect(numberToFrench(1)).toBe("un");
    expect(numberToFrench(8)).toBe("huit");
    expect(numberToFrench(17)).toBe("dix-sept");
    expect(numberToFrench(19)).toBe("dix-neuf");
  });

  it("keeps digits for 20 and above", () => {
    expect(numberToFrench(20)).toBe("20");
    expect(numberToFrench(42)).toBe("42");
    expect(numberToFrench(1000)).toBe("1000");
  });

  it("returns the raw string for invalid input", () => {
    expect(numberToFrench(-1)).toBe("-1");
    expect(numberToFrench(1.5)).toBe("1.5");
    expect(numberToFrench(NaN)).toBe("NaN");
  });

  it("capitalises the first letter with numberToFrenchCap", () => {
    expect(numberToFrenchCap(8)).toBe("Huit");
    expect(numberToFrenchCap(42)).toBe("42");
  });
});
