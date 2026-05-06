import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

// Cookie de step-up admin. Host-only (Domain non défini) pour éviter
// qu'un step-up posé sur sortie.colist.fr élève www.colist.fr — les
// deux sont des hosts admin distincts qui doivent re-prouver leur 2FA
// indépendamment.
//
// Format : `${sessionId}.${expiresAtSeconds}.${hmacBase64Url}`. HMAC-SHA256
// sur `${sessionId}.${expiresAtSeconds}`, secret = BETTER_AUTH_SECRET.

const COOKIE_NAME = "admin_stepup";
export const ADMIN_STEP_UP_TTL_SECONDS = 30 * 60; // 30 min

function getSecret(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not set");
  }
  return Buffer.from(secret, "utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/**
 * Lit le cookie de step-up et vérifie qu'il (a) a une signature valide,
 * (b) appartient à la session courante, (c) n'est pas expiré.
 */
export async function hasAdminStepUp(sessionId: string): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) {
    return false;
  }
  const parts = raw.split(".");
  if (parts.length !== 3) {
    return false;
  }
  const [cookieSessionId, expiresAtStr, sig] = parts;
  if (cookieSessionId !== sessionId) {
    return false;
  }
  const expiresAt = Number.parseInt(expiresAtStr, 10);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) {
    return false;
  }
  const expected = sign(`${cookieSessionId}.${expiresAtStr}`);
  return safeEqual(expected, sig);
}

/**
 * Pose le cookie de step-up. À appeler **uniquement** après une vérif
 * TOTP/backup-code Better Auth réussie (jamais après un magic-link ou
 * un OAuth seul — la 2FA admin doit rester un facteur explicite).
 */
export async function markAdminStepUp(sessionId: string): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_STEP_UP_TTL_SECONDS;
  const payload = `${sessionId}.${expiresAt}`;
  const value = `${payload}.${sign(payload)}`;
  // domain volontairement omis : cookie host-only, jamais partagé entre
  // www.colist.fr et sortie.colist.fr.
  (await cookies()).set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_STEP_UP_TTL_SECONDS,
  });
}

export async function clearAdminStepUp(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

// Path next sécurisé pour les redirects post-2FA. Doit être un path local
// qui appartient strictement à la zone admin (préfixe `${prefix}/` ou égal
// `${prefix}`). Rejette les open-redirects classiques : protocol-relative
// `//evil.com`, paths qui matchent le préfixe sans slash (`/admin@evil`,
// `/adminx`), backslashes (parsing edge), schemes (`javascript:`, `data:`).
export function safeAdminNext(next: string | undefined, prefix: string): string {
  if (!next) {
    return prefix;
  }
  if (next.startsWith("//") || next.includes("\\") || next.includes(":")) {
    return prefix;
  }
  if (next === prefix) {
    return next;
  }
  if (next.startsWith(`${prefix}/`)) {
    return next;
  }
  return prefix;
}

export function isStepUpExemptPath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  return pathname.includes("/admin/2fa-challenge") || pathname.includes("/admin/2fa-enroll");
}
