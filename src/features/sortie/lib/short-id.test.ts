import { describe, expect, it } from "vitest";
import { generateShortId, slugifyAscii } from "./short-id";

describe("short-id / generateShortId", () => {
  it("produces an 8-character string", () => {
    expect(generateShortId()).toHaveLength(8);
  });

  it("only uses the unambiguous alphabet", () => {
    for (let i = 0; i < 500; i++) {
      expect(generateShortId()).toMatch(
        /^[23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/
      );
    }
  });

  it("has high entropy: 10 000 ids produce zero collisions", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      seen.add(generateShortId());
    }
    expect(seen.size).toBe(10_000);
  });
});

describe("short-id / slugifyAscii", () => {
  it("lowercases and replaces spaces with dashes", () => {
    expect(slugifyAscii("Macbeth à la Comédie")).toBe("macbeth-a-la-comedie");
  });

  it("strips diacritics", () => {
    expect(slugifyAscii("Opéra de Paris — Carmen")).toBe("opera-de-paris-carmen");
  });

  it("collapses consecutive non-alphanumerics into a single dash", () => {
    expect(slugifyAscii("a   b!!c")).toBe("a-b-c");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugifyAscii("---hello---")).toBe("hello");
  });

  it("respects maxLen and never leaves a trailing dash after the slice", () => {
    const result = slugifyAscii("titre très long qui dépasse le maximum", 15);
    expect(result.length).toBeLessThanOrEqual(15);
    expect(result.endsWith("-")).toBe(false);
  });

  it("returns an empty string for input that is entirely non-alphanumeric", () => {
    expect(slugifyAscii("!!!@@@###")).toBe("");
  });
});
