import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Anonymous device identity for Sortie. A single cookie is set per browser,
 * never exposed to JavaScript, and never leaves the server unhashed when
 * stored. The raw token lives only in the HTTP-only cookie; the DB stores a
 * SHA-256 hash so a DB leak doesn't let an attacker forge cookies.
 *
 * The cookie is host-only (no Domain attribute) so it's scoped to
 * sortie.colist.fr and never sent to www.colist.fr — the anonymous identity
 * is a Sortie concern and must not cross into CoList requests.
 */

const COOKIE_NAME = "sortie_pt";
const TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year

function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Read-only: returns the SHA-256 hash of the participant cookie, or null if
 * the cookie is missing. Safe to call from Server Components.
 */
export async function readParticipantTokenHash(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return raw ? hashToken(raw) : null;
}

/**
 * Read-or-create: returns the hash, setting the cookie on first visit.
 * Must be called from a Server Action or a Route Handler — setting cookies
 * from a Server Component is not supported by Next.js.
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
    // Host-only: no domain attribute, so the cookie stays on sortie.colist.fr
    // and never mixes with CoList requests.
  });
  return hashToken(raw);
}
