import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Anonymous device identity. Cookie is host-only (no Domain attribute) so it
 * never travels to www.colist.fr — the anonymous identity is a Sortie concern.
 */

const COOKIE_NAME = "sortie_pt";
const TTL_SECONDS = 60 * 60 * 24 * 365;

function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function ensureParticipantTokenHash(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) {
    return hashToken(existing);
  }

  const raw = generateRawToken();
  store.set(COOKIE_NAME, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
  return hashToken(raw);
}
