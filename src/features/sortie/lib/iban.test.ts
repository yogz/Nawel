import { describe, expect, it } from "vitest";
import { ibanPreview, isValidIban, normalizeIban, phonePreview } from "./iban";

describe("isValidIban", () => {
  it.each([
    ["FR1420041010050500013M02606", "classic French"],
    ["DE89370400440532013000", "German sample"],
    ["GB82WEST12345698765432", "UK sample"],
    ["BE68539007547034", "Belgian sample"],
    ["fr14 2004 1010 0505 0001 3M02 606", "lowercased + spaced, still valid"],
  ])("accepts %s (%s)", (iban) => {
    expect(isValidIban(iban)).toBe(true);
  });

  it("rejects a mangled checksum", () => {
    expect(isValidIban("FR1420041010050500013M02607")).toBe(false);
  });

  it("rejects too-short input", () => {
    expect(isValidIban("FR76")).toBe(false);
  });

  it("rejects missing country code", () => {
    expect(isValidIban("1420041010050500013M02606")).toBe(false);
  });

  it("never throws on garbage", () => {
    expect(isValidIban("")).toBe(false);
    expect(isValidIban("hello")).toBe(false);
    expect(isValidIban("💥💥💥")).toBe(false);
  });
});

describe("normalizeIban", () => {
  it("uppercases and strips spaces", () => {
    expect(normalizeIban("fr14 2004 1010 0505 0001 3m02 606")).toBe("FR1420041010050500013M02606");
  });
});

describe("ibanPreview", () => {
  it("keeps the country prefix and the last 4 digits", () => {
    expect(ibanPreview("FR1420041010050500013M02606")).toBe("FR14 **** 2606");
  });

  it("degrades gracefully on short input", () => {
    expect(ibanPreview("AB12")).toBe("****");
  });
});

describe("phonePreview", () => {
  it("masks a French mobile while keeping the last two digits", () => {
    expect(phonePreview("+33 6 12 34 56 78")).toBe("+33 6 ** ** ** 78");
  });

  it("handles local-format numbers", () => {
    expect(phonePreview("06 12 34 56 78")).toBe("** ** ** 78");
  });

  it("degrades gracefully on empty input", () => {
    expect(phonePreview("")).toBe("****");
  });
});
