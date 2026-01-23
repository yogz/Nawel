import { db } from "../src/lib/db";
import { people } from "../drizzle/schema";

async function check() {
  try {
    console.log("Checking database connection...");
    const results = await db.select().from(people).limit(1);
    console.log("Successfully queried 'people' table.");
    console.log(
      "Columns present in first row:",
      results.length > 0 ? Object.keys(results[0]) : "No rows found"
    );
    process.exit(0);
  } catch (e) {
    console.error("Database query failed:", e);
    process.exit(1);
  }
}

check();
