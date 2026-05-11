"use server";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { hasPasswordCredential } from "@/features/admin/lib/has-password-credential";
import { getClientIp, rateLimit } from "@/features/sortie/lib/rate-limit";

export type AccountStatus = {
  /** Compte existe pour cet email (silent ou explicite). */
  exists: boolean;
  /** Compte a un row `account` avec providerId=credential ET password
   * non-null — donc l'utilisateur peut se logger via email/password. */
  hasPassword: boolean;
};

const NEUTRAL: AccountStatus = { exists: false, hasPassword: false };

/**
 * Pré-check côté serveur avant que l'utilisateur clique un CTA. Évite
 * deux pièges UX :
 *
 *   1. Compte silent (créé au RSVP avec email, sans password) qui
 *      essaie le path "j'ai un mot de passe" → `INVALID_CREDENTIALS`
 *      indistinguable d'un mauvais mdp. On l'oriente vers le magic
 *      link à la place.
 *   2. Compte inexistant qui tape un mdp → erreur générique. On peut
 *      lui dire "On ne te connaît pas, lance le lien magique" plutôt.
 *
 * Sécu : oracle d'énumération. On rate-limit par IP (10/min) et on ne
 * retourne JAMAIS `banned` au client — le sign-in lui-même refusera
 * proprement le user banni au verify.
 */
export async function checkAccountStatus(rawEmail: string): Promise<AccountStatus> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 255) {
    return NEUTRAL;
  }

  const ip = await getClientIp();
  const gate = await rateLimit({
    key: `acct-status:${ip}`,
    limit: 10,
    windowSeconds: 60,
  });
  if (!gate.ok) {
    return NEUTRAL;
  }

  const u = await db.query.user.findFirst({
    where: sql`lower(${user.email}) = ${email}`,
    columns: { id: true, banned: true },
  });
  if (!u) {
    return NEUTRAL;
  }

  if (u.banned) {
    return { exists: true, hasPassword: false };
  }

  return {
    exists: true,
    hasPassword: await hasPasswordCredential(u.id),
  };
}
