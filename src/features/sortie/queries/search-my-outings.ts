import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { ilikeUnaccent, trigramScore } from "@/lib/db-helpers";
import { escapeLikePattern } from "@/lib/escape-like";
import { outings, participants } from "@drizzle/sortie-schema";

export type SearchedOuting = {
  id: string;
  slug: string;
  shortId: string;
  title: string;
  location: string | null;
  fixedDatetime: Date | null;
  status:
    | "open"
    | "awaiting_purchase"
    | "stale_purchase"
    | "purchased"
    | "past"
    | "settled"
    | "cancelled";
  heroImageUrl: string | null;
};

// Trigrams ne sont pas significatifs en dessous de 3 caractères :
// pour des queries plus courtes on retombe sur du substring strict
// (ILIKE unaccent), évitant le bruit "Marie" matchant "ma".
const MIN_TRIGRAM_LEN = 3;

// Seuil de similarité trigram. 0.22 attrape "clin" → "Céline" et
// "chatlet" → "Châtelet" sans trop de bruit. Si trop de faux
// positifs : monter à 0.28. Si pas assez de matches : descendre à 0.18.
const TRIGRAM_THRESHOLD = 0.22;

// Recherche dans les sorties de l'user (créées + participantes).
// Match insensible à la casse, aux accents, ET tolérant aux typos
// via pg_trgm (similarity > seuil). `q` doit déjà être sanitisé
// (XSS) — la fonction interpole tel quel.
//
// Ranking : exact substring match prioritaire (forcé à score 1.0),
// puis similarity trigram décroissante, puis date décroissante.
//
// Exclut les sorties annulées : un user qui cherche une sortie
// annulée n'attend pas la trouver dans la barre de recherche home.
//
// Perf : pas de transaction (évite 3 round-trips Neon serverless).
// Le filtrage par userId limite déjà les candidats à <50 rows en
// pratique, donc le `similarity() > seuil` en seq scan reste rapide
// même sans utiliser l'index trigram. L'index GIN reste utilisé
// pour les ILIKE (gin_trgm_ops supporte LIKE avec wildcards).
export async function searchMyOutings({
  userId,
  q,
  limit = 8,
}: {
  userId: string;
  q: string;
  limit?: number;
}): Promise<SearchedOuting[]> {
  const trimmed = q.trim();
  if (trimmed.length === 0) return [];

  // ILIKE pattern : on escape les wildcards de l'input user avant
  // d'entourer de %. La similarity trigram, elle, utilise `trimmed`
  // brut (l'escape pollue le score).
  const pattern = `%${escapeLikePattern(trimmed)}%`;
  const useTrigram = trimmed.length >= MIN_TRIGRAM_LEN;

  // Score combiné : exact substring (ILIKE) gagne avec 1.0, sinon
  // similarity trigram. On prend le max entre title et location,
  // avec petite décote sur location pour favoriser les matches title.
  const titleExact = ilikeUnaccent(outings.title, pattern);
  const locationExact = ilikeUnaccent(outings.location, pattern);

  const titleSim = useTrigram ? trigramScore(outings.title, trimmed) : sql<number>`0`;
  const locationSim = useTrigram ? trigramScore(outings.location, trimmed) : sql<number>`0`;

  const score = sql<number>`GREATEST(
    CASE WHEN ${titleExact} THEN 1.0 ELSE COALESCE(${titleSim}, 0) END,
    (CASE WHEN ${locationExact} THEN 1.0 ELSE COALESCE(${locationSim}, 0) END) * 0.85
  )`;

  // Condition de match : pour q ≥ 3 chars, on accepte exact substring
  // OU similarity > seuil. Pas d'opérateur `%` pg_trgm (qui forcerait
  // une transaction `SET LOCAL`) — on filtre directement sur similarity().
  const matchCondition = useTrigram
    ? or(
        titleExact,
        locationExact,
        sql`${titleSim} > ${TRIGRAM_THRESHOLD}`,
        sql`${locationSim} > ${TRIGRAM_THRESHOLD}`
      )
    : or(titleExact, locationExact);

  return await db
    .select({
      id: outings.id,
      slug: outings.slug,
      shortId: outings.shortId,
      title: outings.title,
      location: outings.location,
      fixedDatetime: outings.fixedDatetime,
      status: outings.status,
      heroImageUrl: outings.heroImageUrl,
    })
    .from(outings)
    .where(
      and(
        ne(outings.status, "cancelled"),
        or(
          eq(outings.creatorUserId, userId),
          sql`${outings.id} IN (
            SELECT ${participants.outingId}
            FROM ${participants}
            WHERE ${participants.userId} = ${userId}
              AND ${participants.response} IN ('yes', 'no', 'handle_own', 'interested')
          )`
        ),
        matchCondition
      )
    )
    .orderBy(desc(score), desc(outings.fixedDatetime), desc(outings.createdAt))
    .limit(limit);
}
