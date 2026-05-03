CREATE TYPE "sortie"."ticket_scope" AS ENUM('participant', 'outing');--> statement-breakpoint
CREATE TABLE "sortie"."tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outing_id" uuid NOT NULL,
	"scope" "sortie"."ticket_scope" NOT NULL,
	"participant_id" uuid,
	"blob_url" text NOT NULL,
	"original_filename" varchar(255),
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"encryption_key_id" varchar(50) NOT NULL,
	"iv" varchar(32) NOT NULL,
	"auth_tag" varchar(32) NOT NULL,
	"uploaded_by_user_id" text,
	"revoked_at" timestamp with time zone,
	"revoked_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sortie"."tickets" ADD CONSTRAINT "tickets_outing_id_outings_id_fk" FOREIGN KEY ("outing_id") REFERENCES "sortie"."outings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."tickets" ADD CONSTRAINT "tickets_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "sortie"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."tickets" ADD CONSTRAINT "tickets_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."tickets" ADD CONSTRAINT "tickets_revoked_by_user_id_user_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sortie_tickets_outing_scope_idx" ON "sortie"."tickets" USING btree ("outing_id","scope");--> statement-breakpoint
CREATE INDEX "sortie_tickets_participant_idx" ON "sortie"."tickets" USING btree ("participant_id");--> statement-breakpoint
-- Invariant (scope, participant_id) :
--   scope='participant' ⇒ participant_id NOT NULL  (billet nominatif)
--   scope='outing'      ⇒ participant_id IS NULL   (billet groupé partagé)
-- drizzle-kit ne génère pas les CHECK pour le moment ; on ajoute la contrainte
-- à la main pour que la DB rejette les états incohérents au cas où l'action
-- layer (zod discriminated union) serait court-circuitée.
ALTER TABLE "sortie"."tickets" ADD CONSTRAINT "tickets_scope_participant_check"
  CHECK (
    (scope = 'participant' AND participant_id IS NOT NULL)
    OR (scope = 'outing' AND participant_id IS NULL)
  );