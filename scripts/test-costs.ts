import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function check() {
  try {
    console.log("Checking 'costs' table...");
    const results = await db.execute(sql`SELECT * FROM "costs" LIMIT 1`);
    console.log("Successfully queried 'costs' table.");
    process.exit(0);
  } catch (e) {
    console.error("Query failed:", e);
    process.exit(1);
  }
}

check();
