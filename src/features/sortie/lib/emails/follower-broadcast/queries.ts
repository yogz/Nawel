import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { userFollows } from "@drizzle/sortie-schema";

export type BroadcastRecipient = {
  id: string;
  email: string;
  name: string;
};

/**
 * Liste les followers à notifier d'une nouvelle sortie. Filtres :
 *   - email présent + email vérifié (pas de spam vers des comptes silent
 *     non-confirmés ; aussi : protège la réputation Resend).
 *   - notifyOnFollowedOuting = true (opt-out global respecté).
 *   - id != creator (jamais soi-même, même si quelqu'un se follow lui-même).
 *   - banned = false.
 *
 * Borné à 500 followers max — au-delà, on traite comme un cas extrême
 * et on coupe (pas un usage de produit Sortie en l'état). Ajustable plus
 * tard si l'usage légitime grandit.
 */
export async function listFollowersToNotify(creatorUserId: string): Promise<BroadcastRecipient[]> {
  return db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
    })
    .from(userFollows)
    .innerJoin(user, eq(user.id, userFollows.followerUserId))
    .where(
      and(
        eq(userFollows.followedUserId, creatorUserId),
        isNotNull(user.email),
        eq(user.emailVerified, true),
        eq(user.notifyOnFollowedOuting, true),
        ne(user.id, creatorUserId),
        sql`coalesce(${user.banned}, false) = false`
      )
    )
    .limit(500);
}
