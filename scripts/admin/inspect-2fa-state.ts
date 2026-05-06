import * as dotenv from "dotenv";
dotenv.config();
import { db } from "../../src/lib/db";
import { user, account, twoFactor } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/admin/inspect-2fa-state.ts <email>");
    process.exit(1);
  }

  const u = await db.query.user.findFirst({
    where: sql`lower(${user.email}) = ${email.toLowerCase()}`,
  });
  if (!u) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }
  console.log(
    `User: ${u.email}  id=${u.id}  role=${u.role}  twoFactorEnabled=${u.twoFactorEnabled}`
  );

  const accounts = await db.query.account.findMany({
    where: eq(account.userId, u.id),
    columns: { providerId: true, accountId: true, password: true },
  });
  console.log(`\nAccounts (${accounts.length}):`);
  accounts.forEach((a) => {
    const pwd = a.password ? `[SET, ${a.password.length} chars]` : "null";
    console.log(
      `  providerId=${a.providerId.padEnd(12)} password=${pwd}  accountId=${a.accountId}`
    );
  });

  const tf = await db.query.twoFactor.findFirst({
    where: eq(twoFactor.userId, u.id),
  });
  console.log(
    `\ntwoFactor row: ${tf ? `id=${tf.id}  secret=[${tf.secret.length} chars]  backupCodes=[${tf.backupCodes.length} chars]` : "none"}`
  );

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
