import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { sanitizeStrictText } from "@/lib/sanitize";

/**
 * Crée silencieusement un compte Better Auth (ou réutilise un compte
 * existant) à partir d'un email fourni au RSVP / au create. L'utilisateur
 * n'est pas notifié — son compte vit en `emailVerified=false` jusqu'à
 * ce qu'il signe un magic-link plus tard, où Better Auth créera la row
 * `account` et établira la session.
 *
 * Bénéfice growth : le visiteur qui RSVP avec son email retrouve
 * automatiquement toutes ses sorties au 1er magic-link signin, peu
 * importe le device.
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
 * ou `creatorUserId` sur l'outing. `null` si l'email est invalide ou
 * matche un compte banni.
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
    columns: { id: true, banned: true },
  });
  if (existing) {
    if (existing.banned) {
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
    // notre insert → unique violation. On retombe sur le SELECT.
    console.warn("[silent-user] insert raced or failed, falling back to SELECT", { err, email });
    const fallback = await db.query.user.findFirst({
      where: sql`lower(${user.email}) = ${email}`,
      columns: { id: true, banned: true },
    });
    if (fallback && !fallback.banned) {
      return fallback.id;
    }
    return null;
  }
}
