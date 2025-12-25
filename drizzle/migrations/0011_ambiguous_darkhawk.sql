CREATE TABLE "ingredient_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"dish_name" text NOT NULL,
	"people_count" integer NOT NULL,
	"ingredients" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "days" ALTER COLUMN "date" SET DATA TYPE varchar(50);--> statement-breakpoint
CREATE INDEX "ingredient_cache_dish_people_idx" ON "ingredient_cache" USING btree ("dish_name","people_count");--> statement-breakpoint
CREATE INDEX "ingredient_cache_expires_at_idx" ON "ingredient_cache" USING btree ("expires_at");