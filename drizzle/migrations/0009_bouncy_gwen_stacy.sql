CREATE TABLE "ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"name" text NOT NULL,
	"quantity" text,
	"checked" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingredients_item_id_idx" ON "ingredients" USING btree ("item_id");