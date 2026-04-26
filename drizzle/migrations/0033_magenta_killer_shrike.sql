-- Migration manuelle (Drizzle ne sait pas générer le DROP CONSTRAINT
-- du PK simple ni gérer l'ADD COLUMN NOT NULL sans default temporaire).
-- Stratégie : ajouter source avec DEFAULT 'legacy' pour que les rows
-- existantes restent valides, recomposer le PK, puis retirer le default
-- pour forcer les futurs inserts à passer une source explicite.

ALTER TABLE "sortie"."service_call_stats"
  ADD COLUMN "source" varchar(48) NOT NULL DEFAULT 'legacy';--> statement-breakpoint

ALTER TABLE "sortie"."service_call_stats"
  DROP CONSTRAINT "service_call_stats_pkey";--> statement-breakpoint

ALTER TABLE "sortie"."service_call_stats"
  ADD CONSTRAINT "service_call_stats_service_source_pk" PRIMARY KEY ("service", "source");--> statement-breakpoint

ALTER TABLE "sortie"."service_call_stats"
  ALTER COLUMN "source" DROP DEFAULT;
