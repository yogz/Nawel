ALTER TABLE "sortie"."outings" ADD COLUMN "creator_outing_number" integer;
--> statement-breakpoint
-- Backfill: pour chaque créateur loggé, numérote ses sorties existantes
-- par ordre chronologique (1 = la plus ancienne). Les sorties anonymes
-- (creator_user_id IS NULL) restent à NULL — pas de compteur pour les
-- créateurs sans historique persistent.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY creator_user_id ORDER BY created_at
  ) AS rn
  FROM "sortie"."outings"
  WHERE creator_user_id IS NOT NULL
)
UPDATE "sortie"."outings" o
SET creator_outing_number = n.rn
FROM numbered n
WHERE o.id = n.id;