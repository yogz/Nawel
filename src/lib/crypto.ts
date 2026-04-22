import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM application-level encryption for sensitive user data in the
 * sortie schema (IBANs, phone numbers, BICs). Ciphertext format is
 *
 *     keyId:iv(base64url):tag(base64url):ct(base64url)
 *
 * The keyId prefix lets us rotate keys without rewriting every row at once:
 * readers look up the key by id, writers always use the active key. To rotate,
 * add a new SORTIE_IBAN_KEY_<id> env var, switch SORTIE_IBAN_KEY_ID_ACTIVE,
 * then run a background job that re-encrypts old rows.
 *
 * Raw plaintext never hits the DB, Sentry, or logs. Never log the return value
 * of decrypt(); treat it as secret data that exists only inside the request
 * handler.
 */

const KEY_ENV_PREFIX = "SORTIE_IBAN_KEY_";
const ACTIVE_ENV = "SORTIE_IBAN_KEY_ID_ACTIVE";

let cachedKeys: Record<string, Buffer> | null = null;
let cachedActiveId: string | null = null;

function loadKeys(): { keys: Record<string, Buffer>; activeId: string } {
  if (cachedKeys && cachedActiveId) {
    return { keys: cachedKeys, activeId: cachedActiveId };
  }

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

  cachedKeys = keys;
  cachedActiveId = activeId;
  return { keys, activeId };
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) {
    throw new Error("[sortie/crypto] encryptSecret: empty plaintext");
  }
  const { keys, activeId } = loadKeys();
  const iv = randomBytes(12);
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
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB, "base64url"));
  const pt = Buffer.concat([decipher.update(Buffer.from(ctB, "base64url")), decipher.final()]);
  return pt.toString("utf8");
}

/**
 * Test hook — clears the module-level cache so tests can swap env vars
 * mid-run. Never call this in application code.
 */
export function __resetCryptoCacheForTests(): void {
  cachedKeys = null;
  cachedActiveId = null;
}
