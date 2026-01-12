ALTER TABLE "costs" ADD COLUMN "frequency" varchar(20) DEFAULT 'once' NOT NULL;--> statement-breakpoint
ALTER TABLE "costs" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "costs" ADD COLUMN "stopped_at" timestamp;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "category" text;