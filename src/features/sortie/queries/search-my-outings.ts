import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
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

// Recherche dans les sorties de l'user (créées + participantes), match
// insensible à la casse sur titre OU lieu. `q` doit déjà être sanitisé
// (XSS) et escape-like (wildcards) — la fonction interpole tel quel.
//
// Exclut les sorties annulées : un user qui cherche une sortie annulée
// n'attend pas la trouver dans la barre de recherche home.
export async function searchMyOutings({
  userId,
  q,
  limit = 8,
}: {
  userId: string;
  q: string;
  limit?: number;
}): Promise<SearchedOuting[]> {
  const pattern = `%${q}%`;

  const rows = await db
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
        or(ilike(outings.title, pattern), ilike(outings.location, pattern))
      )
    )
    .orderBy(desc(outings.fixedDatetime), desc(outings.createdAt))
    .limit(limit);

  return rows;
}
