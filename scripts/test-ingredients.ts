import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function check() {
  try {
    console.log("Checking 'ingredients' table...");
    const results = await db.execute(sql`SELECT * FROM "ingredients" LIMIT 1`);
    console.log("Successfully queried 'ingredients' table.");
    console.log(
      "Columns present:",
      results.length > 0 ? Object.keys(results[0]) : "No rows found, checking structure..."
    );

    // Check structure if no rows
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ingredients'
    `);
    console.log(
      "Columns in 'ingredients':",
      columns.map((c) => c.column_name)
    );
    process.exit(0);
  } catch (e) {
    console.error("Query failed:", e);
    process.exit(1);
  }
}

check();
