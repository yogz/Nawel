"use server";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { hasPasswordCredential } from "@/features/admin/lib/has-password-credential";

export type AccountStatus = {
  /** Compte existe pour cet email (silent ou explicite). */
  exists: boolean;
  /** Compte a un row `account` avec providerId=credential ET password
   * non-null — donc l'utilisateur peut se logger via email/password. */
  hasPassword: boolean;
  /** L'admin a banni ce compte — on retourne un message neutre côté
   * UI plutôt que de fail au signIn. */
  banned: boolean;
};

/**
 * Pré-check côté serveur avant que l'utilisateur clique un CTA. Évite
 * trois pièges UX :
 *
 *   1. Compte silent (créé au RSVP avec email, sans password) qui
 *      essaie le path "j'ai un mot de passe" → `INVALID_CREDENTIALS`
 *      indistinguable d'un mauvais mdp. On l'oriente vers le magic
 *      link à la place.
 *   2. Compte inexistant qui tape un mdp → erreur générique. On peut
 *      lui dire "On ne te connaît pas, lance le lien magique" plutôt.
 *   3. Compte banni → message neutre "Connexion impossible, contacte
 *      support" plutôt que d'exposer l'état banni.
 *
 * L'action est volontairement passive (read-only) et ne consomme pas
 * de rate-limit Better Auth — c'est un signal pré-form, pas une
 * tentative d'auth.
 */
export async function checkAccountStatus(rawEmail: string): Promise<AccountStatus> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 255) {
    return { exists: false, hasPassword: false, banned: false };
  }

  const u = await db.query.user.findFirst({
    where: sql`lower(${user.email}) = ${email}`,
    columns: { id: true, banned: true },
  });
  if (!u) {
    return { exists: false, hasPassword: false, banned: false };
  }

  return {
    exists: true,
    hasPassword: await hasPasswordCredential(u.id),
    banned: u.banned ?? false,
  };
}
