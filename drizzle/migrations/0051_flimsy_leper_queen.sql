ALTER TABLE "events" ADD COLUMN "locale" varchar(8) DEFAULT 'fr' NOT NULL;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "items_changed_at" timestamp;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "assessment" text;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "assessment_input_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "assessment_computed_at" timestamp;--> statement-breakpoint
CREATE INDEX "meals_assessment_due_idx" ON "meals" USING btree ("items_changed_at") WHERE "meals"."items_changed_at" IS NOT NULL;