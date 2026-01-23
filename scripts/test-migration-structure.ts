import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function check() {
  try {
    const columns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
    `);
    console.log("Columns in 'drizzle.__drizzle_migrations':", columns);
    process.exit(0);
  } catch (e) {
    console.error("Query failed:", e);
    process.exit(1);
  }
}

check();
