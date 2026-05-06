import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

// Cookie de step-up admin : prouve qu'une vérif TOTP/backup-code valide
// a été passée < TTL minutes pour cette session. **Host-only** (pas de
// Domain=.colist.fr) pour éviter qu'un step-up posé sur sortie.colist.fr
// élève automatiquement www.colist.fr (et vice-versa) — point bloquant
// du sécu agent. Path=/ pour rester accessible au niveau /admin (Sortie
// utilise /sortie/admin via proxy rewrite, CoList utilise /[locale]/admin).
//
// Format de la valeur : `${sessionId}.${expiresAtSeconds}.${hmacBase64Url}`.
// HMAC-SHA256 sur `${sessionId}.${expiresAtSeconds}` avec BETTER_AUTH_SECRET.
// Validation : recompute HMAC + timingSafeEqual + check expiresAt.

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
  (await cookies()).set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_STEP_UP_TTL_SECONDS,
    // domain volontairement omis : cookie host-only, jamais partagé entre
    // www.colist.fr et sortie.colist.fr.
  });
}

/**
 * Efface le cookie de step-up (à appeler au sign-out, ou quand un admin
 * veut explicitement révoquer la fenêtre de step-up sans logout complet).
 */
export async function clearAdminStepUp(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
