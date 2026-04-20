ALTER TABLE "feedback" ADD COLUMN "person_id" integer;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "token_expires_at" timestamp DEFAULT now() + interval '180 days';--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;