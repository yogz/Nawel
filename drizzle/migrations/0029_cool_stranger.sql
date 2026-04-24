CREATE TYPE "sortie"."outing_vibe" AS ENUM('theatre', 'opera', 'concert', 'cine', 'expo', 'autre');--> statement-breakpoint
ALTER TABLE "sortie"."outings" ADD COLUMN "vibe" "sortie"."outing_vibe";