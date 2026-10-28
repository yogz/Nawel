import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { outings, participants } from "@drizzle/sortie-schema";
import { user } from "@drizzle/schema";
import type { RegularRow } from "@/features/sortie/lib/already-bought/regulars";

/**
 * Lignes brutes des personnes venues (« oui » / « gère son billet ») aux
 * sorties créées par cet organisateur — à regrouper avec `groupRegulars`.
 * Sorties annulées et comptes bannis exclus. Serveur uniquement : contient
 * des adresses e-mail.
 */
export async function listRegularRows(creatorUserId: string): Promise<RegularRow[]> {
  const rows = await db
    .select({
      userId: participants.userId,
      userName: user.name,
      userEmail: user.email,
      anonName: participants.anonName,
      anonEmail: participants.anonEmail,
      outingId: outings.id,
      outingTitle: outings.title,
      startsAt: outings.fixedDatetime,
    })
    .from(participants)
    .innerJoin(outings, eq(outings.id, participants.outingId))
    .leftJoin(user, eq(user.id, participants.userId))
    .where(
      and(
        eq(outings.creatorUserId, creatorUserId),
        ne(outings.status, "cancelled"),
        inArray(participants.response, ["yes", "handle_own"]),
        or(isNull(user.id), ne(user.banned, true), isNull(user.banned))
      )
    )
    .limit(2000);

  return rows.map((r) => ({
    userId: r.userId,
    userName: r.userName,
    anonName: r.anonName,
    email: r.userEmail ?? r.anonEmail,
    outingId: r.outingId,
    outingTitle: r.outingTitle,
    startsAt: r.startsAt,
  }));
}
