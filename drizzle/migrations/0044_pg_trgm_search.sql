CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- L'extension `unaccent` est STABLE par défaut (lit la config dict),
-- donc inutilisable dans une expression d'index. On wrap en IMMUTABLE
-- en passant explicitement le nom du dict — c'est une supercherie
-- assumée et documentée (cf. doc Postgres unaccent).
CREATE OR REPLACE FUNCTION "sortie"."immutable_unaccent"(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent', lower($1)) $$;

-- Index GIN trigram sur title et location. `gin_trgm_ops` couvre à la
-- fois l'opérateur `%` (similarity, fuzzy) et les patterns ILIKE.
CREATE INDEX IF NOT EXISTS "sortie_outings_title_trgm_idx"
  ON "sortie"."outings"
  USING GIN ("sortie"."immutable_unaccent"(title) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "sortie_outings_location_trgm_idx"
  ON "sortie"."outings"
  USING GIN ("sortie"."immutable_unaccent"(location) gin_trgm_ops)
  WHERE location IS NOT NULL;
