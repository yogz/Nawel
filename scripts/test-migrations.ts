import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function check() {
  try {
    console.log("Checking drizzle.__drizzle_migrations table...");
    const results = await db.execute(
      sql`SELECT * FROM "drizzle"."__drizzle_migrations" ORDER BY created_at DESC`
    );
    console.log("Migration records:", results);
    process.exit(0);
  } catch (e) {
    console.error("Failed to query migration table:", e);
    process.exit(1);
  }
}

check();
