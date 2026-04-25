CREATE TABLE "ai_usage_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" varchar(10) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_lookup_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"query_hash" varchar(64) NOT NULL,
	"query" text NOT NULL,
	"payload" text NOT NULL,
	"sources_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_lookup_cache_query_hash_unique" UNIQUE("query_hash")
);
--> statement-breakpoint
CREATE INDEX "ai_usage_daily_date_provider_idx" ON "ai_usage_daily" USING btree ("date","provider");--> statement-breakpoint
CREATE INDEX "event_lookup_cache_query_hash_idx" ON "event_lookup_cache" USING btree ("query_hash");--> statement-breakpoint
CREATE INDEX "event_lookup_cache_created_at_idx" ON "event_lookup_cache" USING btree ("created_at");