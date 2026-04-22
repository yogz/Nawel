CREATE SCHEMA "sortie";
--> statement-breakpoint
CREATE TYPE "sortie"."outing_mode" AS ENUM('fixed', 'vote');--> statement-breakpoint
CREATE TYPE "sortie"."outing_status" AS ENUM('open', 'awaiting_purchase', 'stale_purchase', 'purchased', 'past', 'settled', 'cancelled');--> statement-breakpoint
CREATE TYPE "sortie"."rsvp_response" AS ENUM('yes', 'no', 'handle_own', 'interested');--> statement-breakpoint
CREATE TABLE "sortie"."magic_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"outing_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "magic_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sortie"."outing_timeslots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outing_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sortie"."outings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"short_id" varchar(8) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"creator_user_id" text,
	"creator_anon_name" varchar(100),
	"creator_anon_email" varchar(255),
	"title" varchar(200) NOT NULL,
	"location" varchar(200),
	"event_link" text,
	"deadline_at" timestamp with time zone NOT NULL,
	"mode" "sortie"."outing_mode" DEFAULT 'fixed' NOT NULL,
	"fixed_datetime" timestamp with time zone,
	"chosen_timeslot_id" uuid,
	"status" "sortie"."outing_status" DEFAULT 'open' NOT NULL,
	"show_on_profile" boolean DEFAULT true NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "outings_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
CREATE TABLE "sortie"."participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outing_id" uuid NOT NULL,
	"user_id" text,
	"anon_name" varchar(100),
	"anon_email" varchar(255),
	"cookie_token_hash" varchar(64) NOT NULL,
	"cookie_token_expires_at" timestamp with time zone DEFAULT now() + interval '365 days' NOT NULL,
	"response" "sortie"."rsvp_response" NOT NULL,
	"extra_adults" integer DEFAULT 0 NOT NULL,
	"extra_children" integer DEFAULT 0 NOT NULL,
	"responded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sortie"."timeslot_votes" (
	"participant_id" uuid NOT NULL,
	"timeslot_id" uuid NOT NULL,
	"available" boolean DEFAULT false NOT NULL,
	CONSTRAINT "timeslot_votes_participant_id_timeslot_id_pk" PRIMARY KEY("participant_id","timeslot_id")
);
--> statement-breakpoint
ALTER TABLE "sortie"."magic_links" ADD CONSTRAINT "magic_links_outing_id_outings_id_fk" FOREIGN KEY ("outing_id") REFERENCES "sortie"."outings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."outing_timeslots" ADD CONSTRAINT "outing_timeslots_outing_id_outings_id_fk" FOREIGN KEY ("outing_id") REFERENCES "sortie"."outings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."outings" ADD CONSTRAINT "outings_creator_user_id_user_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."participants" ADD CONSTRAINT "participants_outing_id_outings_id_fk" FOREIGN KEY ("outing_id") REFERENCES "sortie"."outings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."participants" ADD CONSTRAINT "participants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."timeslot_votes" ADD CONSTRAINT "timeslot_votes_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "sortie"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."timeslot_votes" ADD CONSTRAINT "timeslot_votes_timeslot_id_outing_timeslots_id_fk" FOREIGN KEY ("timeslot_id") REFERENCES "sortie"."outing_timeslots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sortie_magic_links_token_hash_idx" ON "sortie"."magic_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sortie_magic_links_outing_idx" ON "sortie"."magic_links" USING btree ("outing_id");--> statement-breakpoint
CREATE INDEX "sortie_timeslots_outing_idx" ON "sortie"."outing_timeslots" USING btree ("outing_id");--> statement-breakpoint
CREATE INDEX "sortie_outings_short_id_idx" ON "sortie"."outings" USING btree ("short_id");--> statement-breakpoint
CREATE INDEX "sortie_outings_creator_user_idx" ON "sortie"."outings" USING btree ("creator_user_id");--> statement-breakpoint
CREATE INDEX "sortie_outings_deadline_idx" ON "sortie"."outings" USING btree ("deadline_at");--> statement-breakpoint
CREATE INDEX "sortie_participants_outing_idx" ON "sortie"."participants" USING btree ("outing_id");--> statement-breakpoint
CREATE INDEX "sortie_participants_cookie_idx" ON "sortie"."participants" USING btree ("cookie_token_hash");--> statement-breakpoint
CREATE INDEX "sortie_participants_user_idx" ON "sortie"."participants" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sortie_participants_outing_cookie_unique" ON "sortie"."participants" USING btree ("outing_id","cookie_token_hash");