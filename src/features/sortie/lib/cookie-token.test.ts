import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { hashToken } from "./cookie-token";

describe("cookie-token / hashToken", () => {
  it("returns the SHA-256 hex digest of the input", () => {
    const input = "abcdef";
    const expected = createHash("sha256").update(input).digest("hex");
    expect(hashToken(input)).toBe(expected);
  });

  it("is deterministic: same input always hashes to the same output", () => {
    const a = hashToken("token-A");
    const b = hashToken("token-A");
    expect(a).toBe(b);
  });

  it("produces distinct hashes for distinct inputs", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });

  it("returns a 64-char hex string", () => {
    const h = hashToken("whatever");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
