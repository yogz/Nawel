import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for sensitive data stored in the sortie schema.
 *
 * Two key namespaces, each with independent rotation:
 *   - IBAN namespace (`SORTIE_IBAN_KEY_*`): IBANs, phone numbers, BICs.
 *     Stored inline in the DB as `keyId:iv:tag:ct` base64url string.
 *   - TICKET namespace (`SORTIE_TICKET_KEY_*`): event ticket files (binary).
 *     Ciphertext lives on Vercel Blob; iv/tag/keyId are stored as separate
 *     columns next to the blob URL.
 */

const IV_BYTES = 12;
const TAG_BYTES = 16;

type KeyNamespace = {
  prefix: string;
  activeEnv: string;
};

const IBAN_NS: KeyNamespace = {
  prefix: "SORTIE_IBAN_KEY_",
  activeEnv: "SORTIE_IBAN_KEY_ID_ACTIVE",
};

const TICKET_NS: KeyNamespace = {
  prefix: "SORTIE_TICKET_KEY_",
  activeEnv: "SORTIE_TICKET_KEY_ID_ACTIVE",
};

function loadKeys(ns: KeyNamespace): { keys: Record<string, Buffer>; activeId: string } {
  const activeId = process.env[ns.activeEnv];
  if (!activeId) {
    throw new Error(
      `[sortie/crypto] ${ns.activeEnv} is not set. Required to encrypt sensitive data.`
    );
  }

  const keys: Record<string, Buffer> = {};
  for (const [envName, value] of Object.entries(process.env)) {
    if (!envName.startsWith(ns.prefix) || envName === ns.activeEnv) {
      continue;
    }
    if (!value) {
      continue;
    }
    const id = envName.slice(ns.prefix.length).toLowerCase();
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
      `[sortie/crypto] Active key "${activeId}" not found (looked for ${ns.prefix}${activeId.toUpperCase()}).`
    );
  }

  return { keys, activeId };
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) {
    throw new Error("[sortie/crypto] encryptSecret: empty plaintext");
  }
  const { keys, activeId } = loadKeys(IBAN_NS);
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
  const { keys } = loadKeys(IBAN_NS);
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

export type EncryptedTicketEnvelope = {
  keyId: string;
  iv: string; // base64url, 12 bytes decoded
  authTag: string; // base64url, 16 bytes decoded
  ciphertext: Buffer;
};

/**
 * Encrypt arbitrary binary content (ticket file) with the TICKET namespace.
 * Caller stores `ciphertext` on Vercel Blob, and `keyId`/`iv`/`authTag` next
 * to the blob URL — separating ciphertext from metadata means a leaked DB
 * dump alone is useless without the env-side key, and a leaked Blob bucket
 * alone is useless without the DB metadata.
 */
export function encryptBytes(plaintext: Buffer): EncryptedTicketEnvelope {
  if (!plaintext || plaintext.length === 0) {
    throw new Error("[sortie/crypto] encryptBytes: empty plaintext");
  }
  const { keys, activeId } = loadKeys(TICKET_NS);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keys[activeId], iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    keyId: activeId,
    iv: iv.toString("base64url"),
    authTag: tag.toString("base64url"),
    ciphertext,
  };
}

export function decryptBytes(envelope: EncryptedTicketEnvelope): Buffer {
  const { keys } = loadKeys(TICKET_NS);
  const key = keys[envelope.keyId];
  if (!key) {
    throw new Error(`[sortie/crypto] decryptBytes: unknown keyId "${envelope.keyId}"`);
  }
  const iv = Buffer.from(envelope.iv, "base64url");
  const tag = Buffer.from(envelope.authTag, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("[sortie/crypto] decryptBytes: bad iv or tag length");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(envelope.ciphertext), decipher.final()]);
}
