/**
 * Applique uniquement les 2 nouvelles tables (event_lookup_cache,
 * ai_usage_daily) en SQL direct, en contournant le blocage des
 * migrations drizzle.
 *
 * Lance avec : npx tsx --env-file=.env scripts/apply-event-cache-tables.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function main() {
  console.log("Création event_lookup_cache…");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "event_lookup_cache" (
      "id" serial PRIMARY KEY NOT NULL,
      "query_hash" varchar(64) NOT NULL,
      "query" text NOT NULL,
      "payload" text NOT NULL,
      "sources_count" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "event_lookup_cache_query_hash_unique" UNIQUE("query_hash")
    );
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "event_lookup_cache_query_hash_idx"
      ON "event_lookup_cache" USING btree ("query_hash");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "event_lookup_cache_created_at_idx"
      ON "event_lookup_cache" USING btree ("created_at");
  `);

  console.log("Création ai_usage_daily…");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "ai_usage_daily" (
      "id" serial PRIMARY KEY NOT NULL,
      "date" varchar(10) NOT NULL,
      "provider" varchar(50) NOT NULL,
      "count" integer DEFAULT 0 NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "ai_usage_daily_date_provider_idx"
      ON "ai_usage_daily" USING btree ("date","provider");
  `);
  // Composé unique pour permettre le ON CONFLICT (date, provider) DO UPDATE
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_daily_date_provider_unique'
      ) THEN
        ALTER TABLE "ai_usage_daily"
          ADD CONSTRAINT "ai_usage_daily_date_provider_unique" UNIQUE ("date", "provider");
      END IF;
    END$$;
  `);

  console.log("✅ tables créées");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
