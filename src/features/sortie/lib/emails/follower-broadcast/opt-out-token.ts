import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC stateless one-click opt-out token. Embarque le `userId` du
 * destinataire signé HS256, encodé en base64url. Pas d'expiration : un
 * email vieux d'un an doit toujours fonctionner (les inboxes gardent
 * l'historique). Pas de table : l'opt-out est idempotent (toggle d'un
 * boolean), un re-clic n'a pas d'effet de bord. Si le user re-active
 * depuis /moi puis re-clique l'ancien lien, ça redésactive — comportement
 * cohérent avec l'intent de l'email original.
 *
 * Format : `<payload-b64u>.<sig-b64u>` où payload = JSON `{uid, v: 1}`.
 */

const SECRET_ENV = "SORTIE_UNSUBSCRIBE_SECRET";

function getSecret(): string {
  const s = process.env[SECRET_ENV];
  if (!s || s.length < 32) {
    throw new Error(`[opt-out-token] ${SECRET_ENV} must be set to a 32+ char secret`);
  }
  return s;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer | null {
  // Reject anything outside the alphabet to avoid sneaky variants.
  if (!/^[A-Za-z0-9_-]*$/.test(s)) {
    return null;
  }
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const std = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  try {
    return Buffer.from(std, "base64");
  } catch {
    return null;
  }
}

function hmac(payload: string): Buffer {
  return createHmac("sha256", getSecret()).update(payload).digest();
}

export function signOptOutToken(uid: string): string {
  const payload = JSON.stringify({ uid, v: 1 });
  const payloadB64 = b64urlEncode(Buffer.from(payload, "utf8"));
  const sigB64 = b64urlEncode(hmac(payloadB64));
  return `${payloadB64}.${sigB64}`;
}

export function verifyOptOutToken(token: string): { uid: string } | null {
  if (typeof token !== "string" || token.length === 0 || token.length > 1024) {
    return null;
  }
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) {
    return null;
  }
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  const expected = hmac(payloadB64);
  const provided = b64urlDecode(sigB64);
  if (!provided || provided.length !== expected.length) {
    return null;
  }
  if (!timingSafeEqual(expected, provided)) {
    return null;
  }

  const payloadBuf = b64urlDecode(payloadB64);
  if (!payloadBuf) {
    return null;
  }
  try {
    const parsed = JSON.parse(payloadBuf.toString("utf8")) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as { uid?: unknown }).uid !== "string" ||
      (parsed as { v?: unknown }).v !== 1
    ) {
      return null;
    }
    const uid = (parsed as { uid: string }).uid;
    if (uid.length === 0 || uid.length > 100) {
      return null;
    }
    return { uid };
  } catch {
    return null;
  }
}
