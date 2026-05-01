import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { account, user } from "@drizzle/schema";
import { sanitizeStrictText } from "@/lib/sanitize";

/**
 * Règle de réutilisation d'un user existant lors d'un RSVP/create anon
 * avec email. Pure pour rester testable sans DB. La fonction côté IO
 * (`ensureSilentUserAccount`) lit user.banned / emailVerified et
 * l'existence d'une row `account`, puis demande à cette règle.
 *
 * `true` = on peut rattacher l'invité au user existant (compte truly
 * silent, jamais authentifié).
 * `false` = compte actif, banni, ou en cours d'auth → l'invité doit
 * rester anon ; le hook session.create.after fera le merge si le vrai
 * propriétaire signe sur le même device.
 */
export function canReuseExistingSilentUser(args: {
  banned: boolean | null;
  emailVerified: boolean;
  hasAccountRow: boolean;
}): boolean {
  if (args.banned) {
    return false;
  }
  if (args.emailVerified) {
    return false;
  }
  if (args.hasAccountRow) {
    return false;
  }
  return true;
}

/**
 * Crée silencieusement un compte Better Auth (ou réutilise un compte
 * silent existant) à partir d'un email fourni au RSVP / au create.
 *
 * **Sécu** : on ne réutilise un user existant QUE s'il est *truly silent*
 * — `emailVerified=false` ET aucune row `account` rattachée. Sinon
 * (email vérifié OU une méthode de signin établie), retourne `null` :
 * sans cette garde, n'importe quel invité tapant l'email d'un compte
 * actif s'attribuait l'identité de la victime côté row participant /
 * créateur de sortie. Le rattachement légitime se fait au premier
 * signin de la victime via le hook session.create.after, qui voit le
 * cookie présent et merge les rows anon → user.
 *
 * Conventions de design :
 *   - **Pas de row `account`** : Better Auth la crée à la demande au
 *     1er signin magic-link. Tant que personne ne se logue, le user
 *     est en mode "shadow" (présent en DB mais sans session active).
 *   - **Match par email lowercase** : Better Auth stocke les emails
 *     avec leur casse d'origine ; on compare en lowercase pour ne
 *     pas créer un doublon "Bob@x.com" / "bob@x.com".
 *   - **Skip si banned** : si un compte existant a `banned=true`, on
 *     préfère retourner `null` plutôt que rattacher l'invité à un
 *     compte que l'admin a explicitement bloqué.
 *
 * Retourne le `user.id` à utiliser comme `userId` sur le participant
 * ou `creatorUserId` sur l'outing. `null` si :
 *   - email invalide / banni / déjà rattaché à un signin établi
 *   - le user existant est vérifié (compte actif → impossible de
 *     prendre son identité sans preuve)
 * Le caller doit traiter `null` comme "stocke en mode anon
 * (anonEmail + userId null)" — le hook session.create.after merge
 * plus tard à la signin du vrai propriétaire.
 */
export async function ensureSilentUserAccount(args: {
  email: string;
  name: string;
}): Promise<string | null> {
  const email = args.email.trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 255) {
    return null;
  }
  // Le name de Better Auth est `notNull` : on garantit au moins
  // quelque chose en se rabattant sur la part locale de l'email.
  // Sanitize pour éviter qu'un anonyme injecte du HTML dans son name.
  const safeName = sanitizeStrictText(args.name, 100) || email.split("@")[0]!.slice(0, 100);

  const existing = await db.query.user.findFirst({
    where: sql`lower(${user.email}) = ${email}`,
    columns: { id: true, banned: true, emailVerified: true },
  });
  if (existing) {
    const hasAccountRow = await userHasAccountRow(existing.id);
    if (
      !canReuseExistingSilentUser({
        banned: existing.banned ?? false,
        emailVerified: existing.emailVerified,
        hasAccountRow,
      })
    ) {
      return null;
    }
    return existing.id;
  }

  // Better Auth accepte n'importe quel string id (cf. doc + schema
  // `text("id").primaryKey()`). On utilise crypto.randomUUID pour
  // rester aligné sur le format du seed Better Auth (UUID v4).
  const id = randomUUID();
  try {
    await db.insert(user).values({
      id,
      email,
      name: safeName,
      emailVerified: false,
    });
    return id;
  } catch (err) {
    // Race possible : un autre RSVP simultané avec le même email
    // (rare mais théoriquement possible) crée le user juste avant
    // notre insert → unique violation. On re-rentre dans la garde
    // ci-dessus en relançant la fonction (récursion bornée à 1 :
    // au 2e tour le user existe forcément).
    console.warn("[silent-user] insert raced or failed, falling back to SELECT", { err, email });
    const fallback = await db.query.user.findFirst({
      where: sql`lower(${user.email}) = ${email}`,
      columns: { id: true, banned: true, emailVerified: true },
    });
    if (!fallback) {
      return null;
    }
    const hasAccountRow = await userHasAccountRow(fallback.id);
    if (
      !canReuseExistingSilentUser({
        banned: fallback.banned ?? false,
        emailVerified: fallback.emailVerified,
        hasAccountRow,
      })
    ) {
      return null;
    }
    return fallback.id;
  }
}

async function userHasAccountRow(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: account.id })
    .from(account)
    .where(eq(account.userId, userId))
    .limit(1);
  return rows.length > 0;
}
