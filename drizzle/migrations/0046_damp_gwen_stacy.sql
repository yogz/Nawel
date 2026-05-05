CREATE TABLE "sortie"."sweeper_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_ms" integer,
	"closed_rsvps" integer DEFAULT 0 NOT NULL,
	"j1_reminders" integer DEFAULT 0 NOT NULL,
	"marked_past" integer DEFAULT 0 NOT NULL,
	"tickets_cleaned_up" integer DEFAULT 0 NOT NULL,
	"lock_skipped" boolean DEFAULT false NOT NULL,
	"errors_json" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sortie_sweeper_runs_started_at_idx" ON "sortie"."sweeper_runs" USING btree ("started_at" DESC NULLS LAST);