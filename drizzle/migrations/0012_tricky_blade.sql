CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"meal_id" integer NOT NULL,
	"title" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"adults" integer DEFAULT 0 NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"people_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "days" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "days" CASCADE;--> statement-breakpoint
ALTER TABLE "items" DROP CONSTRAINT "items_meal_id_meals_id_fk";
--> statement-breakpoint
ALTER TABLE "meals" DROP CONSTRAINT "meals_day_id_days_id_fk";
--> statement-breakpoint
DROP INDEX "ingredient_cache_expires_at_idx";--> statement-breakpoint
DROP INDEX "items_meal_id_idx";--> statement-breakpoint
DROP INDEX "meals_day_id_idx";--> statement-breakpoint
ALTER TABLE "meals" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "change_logs" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "adults" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "children" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredient_cache" ADD COLUMN "confirmations" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredient_cache" ADD COLUMN "rating_sum" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredient_cache" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredient_cache" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "service_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "checked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "ai_rating" integer;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "cache_id" integer;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "event_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "date" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "time" varchar(20);--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "adults" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "children" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "emoji" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "language" text DEFAULT 'fr';--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "services_meal_id_idx" ON "services" USING btree ("meal_id");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_cache_id_ingredient_cache_id_fk" FOREIGN KEY ("cache_id") REFERENCES "public"."ingredient_cache"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_owner_id_idx" ON "events" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "items_service_id_idx" ON "items" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "items_cache_id_idx" ON "items" USING btree ("cache_id");--> statement-breakpoint
CREATE INDEX "meals_event_id_idx" ON "meals" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "people_user_id_idx" ON "people" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "ingredient_cache" DROP COLUMN "expires_at";--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "meal_id";--> statement-breakpoint
ALTER TABLE "meals" DROP COLUMN "day_id";--> statement-breakpoint
ALTER TABLE "meals" DROP COLUMN "order_index";--> statement-breakpoint
ALTER TABLE "meals" DROP COLUMN "people_count";