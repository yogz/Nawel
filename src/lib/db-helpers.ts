import { sql, type SQLWrapper } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

// Match LIKE insensible à la casse ET aux accents.
// Ex : "Celine" matchera "Céline", "CELINE", "Céline", etc.
// Requiert l'extension Postgres `unaccent` (migration 0043).
// `pattern` doit déjà inclure les wildcards `%`/`_` et avoir
// été passé par escapeLikePattern() si l'input vient d'un user.
export function ilikeUnaccent(column: AnyPgColumn | SQLWrapper, pattern: string) {
  return sql`sortie.immutable_unaccent(${column}) LIKE sortie.immutable_unaccent(${pattern})`;
}

// Match trigram-similar (typo-tolerant) sur du texte unaccenté/lowercased.
// Ex : "clin" matchera "Céline", "chatlet" matchera "Châtelet".
// Requiert l'extension `pg_trgm` + fonction `sortie.immutable_unaccent`
// (migration 0044). Le seuil de similarité est lu depuis la session
// Postgres (`pg_trgm.similarity_threshold`) — wrapper la query dans
// une transaction qui SET LOCAL pour le contrôler par appel.
export function trigramSimilar(column: AnyPgColumn | SQLWrapper, q: string) {
  return sql`sortie.immutable_unaccent(${column}) % sortie.immutable_unaccent(${q})`;
}

// Score de similarité [0..1] entre une colonne et la query, après
// unaccent + lower. Utilisé pour ranker les résultats trigram.
export function trigramScore(column: AnyPgColumn | SQLWrapper, q: string) {
  return sql<number>`similarity(sortie.immutable_unaccent(${column}), sortie.immutable_unaccent(${q}))`;
}
