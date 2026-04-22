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

/**
 * Read-only: returns the hash if a cookie already exists, else null. Safe to
 * call from Server Components (which can't set cookies).
 */
export async function readParticipantTokenHash(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return raw ? hashToken(raw) : null;
}

/**
 * Read-or-create: returns the hash, setting the cookie on first visit. Must
 * be called from a Server Action or Route Handler.
 */
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
