ALTER TYPE "sortie"."debt_status" ADD VALUE 'gifted';--> statement-breakpoint
ALTER TABLE "sortie"."purchase_allocations" ADD COLUMN "gifted_at" timestamp with time zone;