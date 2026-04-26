CREATE TABLE "sortie"."service_call_stats" (
	"service" varchar(32) PRIMARY KEY NOT NULL,
	"call_count" integer DEFAULT 0 NOT NULL,
	"found_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"last_called_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error_message" varchar(200),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sortie"."parse_stats" ADD COLUMN "success_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sortie"."parse_stats" ADD COLUMN "image_found_count" integer DEFAULT 0 NOT NULL;