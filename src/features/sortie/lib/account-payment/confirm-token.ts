import { createHash, randomBytes } from "node:crypto";

/**
 * Jeton de confirmation d'un moyen de paiement ajouté sur le compte. Le
 * jeton brut ne vit que dans l'URL du mail ; la base ne garde que son
 * hachage SHA-256 (clé de recherche), effacé à la confirmation.
 * Cf. spec 2026-10-28-sortie-account-payment-methods-design.md §5 bis.
 */

export const CONFIRM_TOKEN_TTL_MS = 15 * 60 * 1000;

export function hashConfirmToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newConfirmToken(now: Date): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashConfirmToken(token),
    expiresAt: new Date(now.getTime() + CONFIRM_TOKEN_TTL_MS),
  };
}

export type ConfirmTokenCheck =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "used" | "other-account" | "other-device" };

/**
 * Empreinte de la session de connexion qui a fait l'ajout : le lien n'est
 * accepté que depuis cette même session (option A choisie par l'owner).
 * Sans ça, le vrai propriétaire pouvait confirmer d'un clic un IBAN ajouté
 * par quelqu'un qui connaît son mot de passe.
 */
export function hashSessionId(sessionId: string): string {
  return createHash("sha256").update(`sortie:acct-pm-session:${sessionId}`).digest("hex");
}

/**
 * `row` = la ligne retrouvée par le hachage du jeton reçu (undefined si
 * aucune). Le compte connecté doit être le propriétaire : un lien transféré
 * ou ouvert dans une autre session ne confirme rien.
 */
export function checkConfirmToken(a: {
  row:
    | {
        userId: string;
        confirmTokenHash: string | null;
        confirmTokenExpiresAt: Date | null;
        confirmedAt: Date | null;
        confirmSessionHash: string | null;
      }
    | undefined;
  sessionUserId: string | null;
  sessionHash: string | null;
  now: Date;
}): ConfirmTokenCheck {
  const { row } = a;
  if (!row) {
    return { ok: false, reason: "invalid" };
  }
  if (a.sessionUserId === null || row.userId !== a.sessionUserId) {
    return { ok: false, reason: "other-account" };
  }
  if (row.confirmedAt !== null || !row.confirmTokenHash || !row.confirmTokenExpiresAt) {
    return { ok: false, reason: "used" };
  }
  if (row.confirmTokenExpiresAt.getTime() <= a.now.getTime()) {
    return { ok: false, reason: "expired" };
  }
  if (!row.confirmSessionHash || a.sessionHash !== row.confirmSessionHash) {
    return { ok: false, reason: "other-device" };
  }
  return { ok: true };
}
