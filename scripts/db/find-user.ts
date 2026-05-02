import * as dotenv from "dotenv";
dotenv.config();

import { ilike, or } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { user } from "../../drizzle/schema";

async function main() {
  const q = process.argv[2];
  if (!q) {
    console.error("Usage: tsx scripts/db/find-user.ts <fragment>");
    process.exit(1);
  }
  const rows = await db.query.user.findMany({
    where: or(
      ilike(user.username, `%${q}%`),
      ilike(user.name, `%${q}%`),
      ilike(user.email, `%${q}%`)
    ),
    columns: { id: true, name: true, username: true, email: true },
    limit: 20,
  });
  if (rows.length === 0) {
    console.log("Aucun match.");
  } else {
    for (const r of rows) {
      console.log(`@${r.username ?? "—"}  name="${r.name ?? ""}"  email=${r.email}  id=${r.id}`);
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
