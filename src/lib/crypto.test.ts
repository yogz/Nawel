import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { decryptBytes, decryptSecret, encryptBytes, encryptSecret } from "./crypto";

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

describe("crypto bytes (AES-256-GCM, ticket namespace)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SORTIE_TICKET_KEY_ID_ACTIVE = "v1";
    process.env.SORTIE_TICKET_KEY_V1 = b64key();
    delete process.env.SORTIE_TICKET_KEY_V2;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("round-trips a binary payload through encryptBytes/decryptBytes", () => {
    // 4 KB de bytes "PDF-like" (commence par %PDF) — vérifie qu'on traite
    // bien des binaires, pas du texte UTF-8.
    const plaintext = Buffer.concat([Buffer.from("%PDF-1.7\n"), randomBytes(4096)]);
    const env = encryptBytes(plaintext);
    expect(env.keyId).toBe("v1");
    expect(env.ciphertext).not.toEqual(plaintext);
    const out = decryptBytes(env);
    expect(out.equals(plaintext)).toBe(true);
  });

  it("uses TICKET namespace, not IBAN namespace", () => {
    // L'isolation des deux namespaces est ce qui permet de rotater les
    // clés ticket sans toucher aux IBAN encryptés (et inversement). On
    // wipe TICKET et garde IBAN — encryptBytes doit échouer.
    delete process.env.SORTIE_TICKET_KEY_ID_ACTIVE;
    delete process.env.SORTIE_TICKET_KEY_V1;
    process.env.SORTIE_IBAN_KEY_ID_ACTIVE = "k1";
    process.env.SORTIE_IBAN_KEY_K1 = b64key();
    expect(() => encryptBytes(Buffer.from("x"))).toThrow(/SORTIE_TICKET_KEY_ID_ACTIVE/);
  });

  it("produces a different iv for each call (random iv)", () => {
    const plaintext = Buffer.from("hello bytes");
    const a = encryptBytes(plaintext);
    const b = encryptBytes(plaintext);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
    expect(decryptBytes(a).equals(plaintext)).toBe(true);
    expect(decryptBytes(b).equals(plaintext)).toBe(true);
  });

  it("decrypts old envelopes after rotation using the keyId in the envelope", () => {
    const originalActive = process.env.SORTIE_TICKET_KEY_V1!;
    const before = encryptBytes(Buffer.from("oldData"));

    process.env.SORTIE_TICKET_KEY_ID_ACTIVE = "v2";
    process.env.SORTIE_TICKET_KEY_V2 = b64key();
    process.env.SORTIE_TICKET_KEY_V1 = originalActive;

    expect(decryptBytes(before).toString("utf8")).toBe("oldData");
    const after = encryptBytes(Buffer.from("newData"));
    expect(after.keyId).toBe("v2");
    expect(decryptBytes(after).toString("utf8")).toBe("newData");
  });

  it("rejects an envelope with an unknown keyId", () => {
    const env = encryptBytes(Buffer.from("x"));
    expect(() => decryptBytes({ ...env, keyId: "vX" })).toThrow(/unknown keyId/);
  });

  it("throws when the ciphertext has been tampered with (GCM auth fail)", () => {
    const env = encryptBytes(Buffer.from("payload bytes"));
    const tampered = Buffer.from(env.ciphertext);
    // Flip un bit du dernier octet — le tag GCM doit refuser de déchiffrer.
    tampered[tampered.length - 1] ^= 0x01;
    expect(() => decryptBytes({ ...env, ciphertext: tampered })).toThrow();
  });

  it("rejects an envelope with a truncated authTag", () => {
    const env = encryptBytes(Buffer.from("payload"));
    // Drop 4 base64url chars ≈ 3 bytes — la longueur ne match plus 16 bytes.
    const shortTag = env.authTag.slice(0, -4);
    expect(() => decryptBytes({ ...env, authTag: shortTag })).toThrow(/bad iv or tag length/);
  });

  it("rejects an envelope with a truncated iv", () => {
    const env = encryptBytes(Buffer.from("payload"));
    const shortIv = env.iv.slice(0, -4);
    expect(() => decryptBytes({ ...env, iv: shortIv })).toThrow(/bad iv or tag length/);
  });

  it("refuses to encrypt empty plaintext", () => {
    expect(() => encryptBytes(Buffer.alloc(0))).toThrow(/empty plaintext/);
  });
});
