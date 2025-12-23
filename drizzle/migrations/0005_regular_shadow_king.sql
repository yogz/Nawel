ALTER TABLE "events" ADD COLUMN "admin_key" varchar(100);--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "emoji" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "days_event_id_idx" ON "days" ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_created_at_idx" ON "events" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_meal_id_idx" ON "items" ("meal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_person_id_idx" ON "items" ("person_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meals_day_id_idx" ON "meals" ("day_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "people_event_id_idx" ON "people" ("event_id");