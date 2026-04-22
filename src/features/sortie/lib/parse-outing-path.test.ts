import { describe, expect, it } from "vitest";
import { canonicalPathSegment, extractShortId } from "./parse-outing-path";

describe("extractShortId", () => {
  it("returns the input when it is already a bare short_id", () => {
    expect(extractShortId("ab23cd7k")).toBe("ab23cd7k");
  });

  it("extracts the tail from a slug-prefixed form", () => {
    expect(extractShortId("macbeth-a-la-comedie-ab23cd7k")).toBe("ab23cd7k");
  });

  it("rejects non-conforming tails", () => {
    expect(extractShortId("macbeth-a-la-comedie-1234567")).toBeNull(); // 7 chars
    expect(extractShortId("ab23cd7")).toBeNull();
    expect(extractShortId("random")).toBeNull();
  });

  it("rejects ambiguous characters from outside the alphabet", () => {
    // '0' is not in the alphabet (confusable with 'O')
    expect(extractShortId("ab0cd7kk")).toBeNull();
  });

  it("handles an empty input", () => {
    expect(extractShortId("")).toBeNull();
  });
});

describe("canonicalPathSegment", () => {
  it("joins slug and short_id with a dash", () => {
    expect(canonicalPathSegment({ slug: "macbeth", shortId: "ab23cd7k" })).toBe("macbeth-ab23cd7k");
  });

  it("returns the bare short_id when slug is null", () => {
    expect(canonicalPathSegment({ slug: null, shortId: "ab23cd7k" })).toBe("ab23cd7k");
  });
});
