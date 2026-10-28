CREATE TABLE "sortie"."user_payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "sortie"."payment_method_type" NOT NULL,
	"value_encrypted" text NOT NULL,
	"value_preview" varchar(80) NOT NULL,
	"display_label" varchar(40),
	"confirmed_at" timestamp with time zone,
	"confirm_token_hash" varchar(64),
	"confirm_token_expires_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sortie"."user_payment_methods" ADD CONSTRAINT "user_payment_methods_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sortie_user_payment_methods_user_idx" ON "sortie"."user_payment_methods" USING btree ("user_id");