CREATE TYPE "sortie"."debt_status" AS ENUM('pending', 'declared_paid', 'confirmed');--> statement-breakpoint
CREATE TYPE "sortie"."payment_method_type" AS ENUM('lydia', 'revolut', 'wero', 'iban');--> statement-breakpoint
CREATE TYPE "sortie"."pricing_mode" AS ENUM('unique', 'category', 'nominal');--> statement-breakpoint
CREATE TABLE "sortie"."audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outing_id" uuid,
	"actor_participant_id" uuid,
	"actor_user_id" text,
	"action" varchar(64) NOT NULL,
	"ip_hash" varchar(64),
	"payload" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sortie"."debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outing_id" uuid NOT NULL,
	"debtor_participant_id" uuid NOT NULL,
	"creditor_participant_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "sortie"."debt_status" DEFAULT 'pending' NOT NULL,
	"declared_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sortie"."purchase_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"is_child" boolean DEFAULT false NOT NULL,
	"nominal_price_cents" integer
);
--> statement-breakpoint
CREATE TABLE "sortie"."purchaser_payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"type" "sortie"."payment_method_type" NOT NULL,
	"value_encrypted" text NOT NULL,
	"value_preview" varchar(80) NOT NULL,
	"display_label" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sortie"."purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outing_id" uuid NOT NULL,
	"purchaser_participant_id" uuid NOT NULL,
	"total_places" integer NOT NULL,
	"pricing_mode" "sortie"."pricing_mode" NOT NULL,
	"unique_price_cents" integer,
	"adult_price_cents" integer,
	"child_price_cents" integer,
	"proof_file_url" text,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sortie"."audit_log" ADD CONSTRAINT "audit_log_outing_id_outings_id_fk" FOREIGN KEY ("outing_id") REFERENCES "sortie"."outings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."audit_log" ADD CONSTRAINT "audit_log_actor_participant_id_participants_id_fk" FOREIGN KEY ("actor_participant_id") REFERENCES "sortie"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."debts" ADD CONSTRAINT "debts_outing_id_outings_id_fk" FOREIGN KEY ("outing_id") REFERENCES "sortie"."outings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."debts" ADD CONSTRAINT "debts_debtor_participant_id_participants_id_fk" FOREIGN KEY ("debtor_participant_id") REFERENCES "sortie"."participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."debts" ADD CONSTRAINT "debts_creditor_participant_id_participants_id_fk" FOREIGN KEY ("creditor_participant_id") REFERENCES "sortie"."participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."purchase_allocations" ADD CONSTRAINT "purchase_allocations_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "sortie"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."purchase_allocations" ADD CONSTRAINT "purchase_allocations_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "sortie"."participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."purchaser_payment_methods" ADD CONSTRAINT "purchaser_payment_methods_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "sortie"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."purchases" ADD CONSTRAINT "purchases_outing_id_outings_id_fk" FOREIGN KEY ("outing_id") REFERENCES "sortie"."outings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie"."purchases" ADD CONSTRAINT "purchases_purchaser_participant_id_participants_id_fk" FOREIGN KEY ("purchaser_participant_id") REFERENCES "sortie"."participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sortie_audit_outing_idx" ON "sortie"."audit_log" USING btree ("outing_id");--> statement-breakpoint
CREATE INDEX "sortie_audit_action_idx" ON "sortie"."audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "sortie_debts_outing_idx" ON "sortie"."debts" USING btree ("outing_id");--> statement-breakpoint
CREATE INDEX "sortie_debts_debtor_idx" ON "sortie"."debts" USING btree ("debtor_participant_id");--> statement-breakpoint
CREATE INDEX "sortie_debts_creditor_idx" ON "sortie"."debts" USING btree ("creditor_participant_id");--> statement-breakpoint
CREATE INDEX "sortie_allocations_purchase_idx" ON "sortie"."purchase_allocations" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "sortie_allocations_participant_idx" ON "sortie"."purchase_allocations" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "sortie_payment_methods_participant_idx" ON "sortie"."purchaser_payment_methods" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "sortie_purchases_outing_idx" ON "sortie"."purchases" USING btree ("outing_id");--> statement-breakpoint
CREATE INDEX "sortie_purchases_purchaser_idx" ON "sortie"."purchases" USING btree ("purchaser_participant_id");