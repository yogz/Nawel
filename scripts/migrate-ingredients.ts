import { sql } from "drizzle-orm";
import { db } from "../lib/db";

async function main() {
  console.log("Creating ingredients table...");

  // Create the table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "ingredients" (
      "id" serial PRIMARY KEY NOT NULL,
      "item_id" integer NOT NULL,
      "name" text NOT NULL,
      "quantity" text,
      "checked" boolean DEFAULT false NOT NULL,
      "order_index" integer DEFAULT 0 NOT NULL
    )
  `);

  // Add foreign key constraint (ignore if exists)
  try {
    await db.execute(sql`
      ALTER TABLE "ingredients"
      ADD CONSTRAINT "ingredients_item_id_items_id_fk"
      FOREIGN KEY ("item_id") REFERENCES "public"."items"("id")
      ON DELETE cascade ON UPDATE no action
    `);
  } catch (e: any) {
    if (!e.message?.includes("already exists")) {
      throw e;
    }
    console.log("Foreign key constraint already exists, skipping...");
  }

  // Create index (ignore if exists)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "ingredients_item_id_idx"
    ON "ingredients" USING btree ("item_id")
  `);

  console.log("✓ Ingredients table created successfully!");
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
