DROP INDEX "sortie"."sortie_purchases_outing_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "sortie_purchases_outing_unique" ON "sortie"."purchases" USING btree ("outing_id");