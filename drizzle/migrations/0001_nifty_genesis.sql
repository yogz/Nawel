CREATE TABLE IF NOT EXISTS "change_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" varchar(20) NOT NULL,
	"table_name" varchar(50) NOT NULL,
	"record_id" integer NOT NULL,
	"old_data" text,
	"new_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
