DROP INDEX "sortie"."sortie_outings_profile_listing_idx";--> statement-breakpoint
CREATE INDEX "sortie_outings_profile_listing_idx" ON "sortie"."outings" USING btree ("creator_user_id","status");--> statement-breakpoint
ALTER TABLE "sortie"."outings" DROP COLUMN "hidden_from_profile_at";