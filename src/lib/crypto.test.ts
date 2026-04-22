import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret } from "./crypto";

function b64key() {
  return randomBytes(32).toString("base64");
}

describe("crypto (AES-256-GCM)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SORTIE_IBAN_KEY_ID_ACTIVE = "k1";
    process.env.SORTIE_IBAN_KEY_K1 = b64key();
    delete process.env.SORTIE_IBAN_KEY_K2;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("round-trips a plaintext through encrypt/decrypt", () => {
    const plaintext = "FR7612345678901234567890123";
    const ciphertext = encryptSecret(plaintext);
    expect(ciphertext).not.toContain(plaintext);
    expect(ciphertext.split(":")).toHaveLength(4);
    expect(decryptSecret(ciphertext)).toBe(plaintext);
  });

  it("produces a different ciphertext each call (random iv)", () => {
    const plaintext = "hello";
    const a = encryptSecret(plaintext);
    const b = encryptSecret(plaintext);
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(plaintext);
    expect(decryptSecret(b)).toBe(plaintext);
  });

  it("prefixes ciphertext with the active keyId", () => {
    process.env.SORTIE_IBAN_KEY_ID_ACTIVE = "k2";
    process.env.SORTIE_IBAN_KEY_K2 = b64key();
    const ciphertext = encryptSecret("x");
    expect(ciphertext.startsWith("k2:")).toBe(true);
  });

  it("decrypts old rows after rotation using the keyId prefix", () => {
    const originalActive = process.env.SORTIE_IBAN_KEY_K1!;
    const beforeRotation = encryptSecret("oldValue");

    process.env.SORTIE_IBAN_KEY_ID_ACTIVE = "k2";
    process.env.SORTIE_IBAN_KEY_K2 = b64key();
    process.env.SORTIE_IBAN_KEY_K1 = originalActive;

    expect(decryptSecret(beforeRotation)).toBe("oldValue");
    const afterRotation = encryptSecret("newValue");
    expect(afterRotation.startsWith("k2:")).toBe(true);
    expect(decryptSecret(afterRotation)).toBe("newValue");
  });

  it("throws on malformed ciphertext", () => {
    expect(() => decryptSecret("not:a:ciphertext")).toThrow(/malformed/);
    expect(() => decryptSecret("")).toThrow(/malformed/);
  });

  it("throws when the keyId in ciphertext is unknown", () => {
    const valid = encryptSecret("x");
    const [, rest] = valid.split(/:(.+)/);
    expect(() => decryptSecret(`kX:${rest}`)).toThrow(/unknown keyId/);
  });

  it("throws when tampered ciphertext is submitted (GCM auth fail)", () => {
    const valid = encryptSecret("payload");
    const [keyId, iv, tag, ct] = valid.split(":");
    const tampered = ct.slice(0, -2) + (ct.slice(-2) === "AA" ? "BB" : "AA");
    expect(() => decryptSecret(`${keyId}:${iv}:${tag}:${tampered}`)).toThrow();
  });

  it("rejects a truncated authentication tag", () => {
    const valid = encryptSecret("payload");
    const [keyId, iv, tag, ct] = valid.split(":");
    // Chop 4 base64url chars ≈ 3 bytes off the tag — still decodes cleanly
    // but the resulting Buffer is not 16 bytes.
    const shortTag = tag.slice(0, -4);
    expect(() => decryptSecret(`${keyId}:${iv}:${shortTag}:${ct}`)).toThrow(/bad iv or tag length/);
  });

  it("rejects a truncated iv", () => {
    const valid = encryptSecret("payload");
    const [keyId, iv, tag, ct] = valid.split(":");
    const shortIv = iv.slice(0, -4);
    expect(() => decryptSecret(`${keyId}:${shortIv}:${tag}:${ct}`)).toThrow(/bad iv or tag length/);
  });

  it("fails loudly when active key id is not configured", () => {
    delete process.env.SORTIE_IBAN_KEY_ID_ACTIVE;
    expect(() => encryptSecret("x")).toThrow(/SORTIE_IBAN_KEY_ID_ACTIVE/);
  });

  it("fails loudly when the active key buffer is the wrong size", () => {
    process.env.SORTIE_IBAN_KEY_K1 = Buffer.from("short").toString("base64");
    expect(() => encryptSecret("x")).toThrow(/32 bytes/);
  });
});
