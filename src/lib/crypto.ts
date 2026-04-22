import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for IBANs, phone numbers, BICs stored in the sortie schema.
 * Ciphertext is `keyId:iv:tag:ct` in base64url — the keyId prefix lets old
 * rows stay readable after rotation.
 */

const KEY_ENV_PREFIX = "SORTIE_IBAN_KEY_";
const ACTIVE_ENV = "SORTIE_IBAN_KEY_ID_ACTIVE";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function loadKeys(): { keys: Record<string, Buffer>; activeId: string } {
  const activeId = process.env[ACTIVE_ENV];
  if (!activeId) {
    throw new Error(
      `[sortie/crypto] ${ACTIVE_ENV} is not set. Required to encrypt sensitive data.`
    );
  }

  const keys: Record<string, Buffer> = {};
  for (const [envName, value] of Object.entries(process.env)) {
    if (!envName.startsWith(KEY_ENV_PREFIX) || envName === ACTIVE_ENV) {
      continue;
    }
    if (!value) {
      continue;
    }
    const id = envName.slice(KEY_ENV_PREFIX.length).toLowerCase();
    const buf = Buffer.from(value, "base64");
    if (buf.length !== 32) {
      throw new Error(
        `[sortie/crypto] ${envName} must decode to exactly 32 bytes, got ${buf.length}.`
      );
    }
    keys[id] = buf;
  }

  if (!keys[activeId]) {
    throw new Error(
      `[sortie/crypto] Active key "${activeId}" not found (looked for ${KEY_ENV_PREFIX}${activeId.toUpperCase()}).`
    );
  }

  return { keys, activeId };
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) {
    throw new Error("[sortie/crypto] encryptSecret: empty plaintext");
  }
  const { keys, activeId } = loadKeys();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keys[activeId], iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${activeId}:${iv.toString("base64url")}:${tag.toString("base64url")}:${ct.toString("base64url")}`;
}

export function decryptSecret(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 4) {
    throw new Error("[sortie/crypto] decryptSecret: malformed ciphertext");
  }
  const [keyId, ivB, tagB, ctB] = parts;
  const { keys } = loadKeys();
  const key = keys[keyId];
  if (!key) {
    throw new Error(`[sortie/crypto] decryptSecret: unknown keyId "${keyId}"`);
  }
  const iv = Buffer.from(ivB, "base64url");
  const tag = Buffer.from(tagB, "base64url");
  // GCM's setAuthTag is permissive on length — a truncated tag with a valid
  // prefix can still verify and weakens authentication. Enforce canonical sizes.
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("[sortie/crypto] decryptSecret: bad iv or tag length");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(Buffer.from(ctB, "base64url")), decipher.final()]);
  return pt.toString("utf8");
}
