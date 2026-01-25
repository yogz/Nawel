import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function check() {
  try {
    console.log("Checking 'ingredient_cache' table...");
    const results = await db.execute(sql`SELECT * FROM "ingredient_cache" LIMIT 1`);
    console.log("Successfully queried 'ingredient_cache' table.");
    console.log(
      "Columns present:",
      results.length > 0 ? Object.keys(results[0]) : "No rows found, checking structure..."
    );

    // Check structure if no rows
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ingredient_cache'
    `);
    console.log(
      "Columns in 'ingredient_cache':",
      columns.map((c) => c.column_name)
    );
    process.exit(0);
  } catch (e) {
    console.error("Query failed:", e);
    process.exit(1);
  }
}

check();
