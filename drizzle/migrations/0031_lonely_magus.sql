CREATE TABLE "sortie"."parse_stats" (
	"host" varchar(253) PRIMARY KEY NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"zero_data_count" integer DEFAULT 0 NOT NULL,
	"fetch_error_count" integer DEFAULT 0 NOT NULL,
	"last_failure_at" timestamp with time zone,
	"last_failure_path" text,
	"last_failure_kind" varchar(16),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "ai_usage_daily_date_provider_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "ai_usage_daily_date_provider_idx" ON "ai_usage_daily" USING btree ("date","provider");