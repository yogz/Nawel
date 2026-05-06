import "server-only";
import { db } from "@/lib/db";
import { account } from "@drizzle/schema";
import { and, eq, isNotNull } from "drizzle-orm";

// True si le user a un compte `credential` (email+password) avec un
// password effectivement set. Détermine si l'enrollment 2FA peut
// fonctionner sans password (Google OAuth-only) — Better Auth applique
// la même logique côté `shouldRequirePassword` (cf. allowPasswordless).
export async function hasPasswordCredential(userId: string): Promise<boolean> {
  const row = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, "credential"),
        isNotNull(account.password)
      )
    )
    .limit(1);
  return row.length > 0;
}
