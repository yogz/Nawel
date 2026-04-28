DROP INDEX "sortie"."sortie_outings_short_id_idx";--> statement-breakpoint
CREATE INDEX "user_email_lower_idx" ON "user" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "user_username_lower_idx" ON "user" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "sortie_debts_outing_status_idx" ON "sortie"."debts" USING btree ("outing_id","status");--> statement-breakpoint
CREATE INDEX "sortie_outings_closing_idx" ON "sortie"."outings" USING btree ("status","deadline_at") WHERE status = 'open';--> statement-breakpoint
CREATE INDEX "sortie_outings_profile_listing_idx" ON "sortie"."outings" USING btree ("creator_user_id","hidden_from_profile_at","status");