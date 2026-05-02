import { and, desc, eq, gt, isNull, ne, notExists, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { outings, participants, userFollows } from "@drizzle/sortie-schema";
import { confirmedCountSql } from "./outing-queries";

/**
 * Vrai ssi `follower` suit `followed`. Lookup PK (composite) — couvert
 * par l'index implicite, pas besoin de scan.
 */
export async function isFollowing(args: {
  followerUserId: string;
  followedUserId: string;
}): Promise<boolean> {
  const row = await db.query.userFollows.findFirst({
    where: and(
      eq(userFollows.followerUserId, args.followerUserId),
      eq(userFollows.followedUserId, args.followedUserId)
    ),
    columns: { followerUserId: true },
  });
  return Boolean(row);
}

/**
 * Liste des suiveurs d'un user, triée par date de follow desc (les plus
 * récents en haut). Joint sur `user` pour récupérer l'avatar + handle
 * et permettre un rendu propre dans la liste sur /moi.
 *
 * Cap à 100 — au-delà, on ajoutera une pagination.
 */
export async function listFollowers(followedUserId: string) {
  return db
    .select({
      followerUserId: userFollows.followerUserId,
      createdAt: userFollows.createdAt,
      name: user.name,
      username: user.username,
      image: user.image,
    })
    .from(userFollows)
    .innerJoin(user, eq(user.id, userFollows.followerUserId))
    .where(eq(userFollows.followedUserId, followedUserId))
    .orderBy(desc(userFollows.createdAt))
    .limit(100);
}

/**
 * Sorties à afficher dans le carrousel "tes suivis" sur la home.
 *
 * Filtres :
 *   - le créateur est suivi par `followerUserId`
 *   - sortie publique sur le profil (`showOnProfile = true`)
 *   - non annulée, non archivée par le créateur
 *   - deadline encore future (sinon le visiteur ne peut plus RSVP →
 *     le carrousel est censé être actionnable)
 *   - le suiveur n'a PAS encore de row participant — sinon doublon
 *     avec ses `UpcomingBuckets` côté home, où la sortie remonte déjà
 *     via sa propre RSVP. Migration naturelle : tu réponds → la card
 *     sort du carrousel et entre dans tes buckets.
 *
 * Tri : prochaine sortie datée en tête, sondages non datés en queue
 * (NULLS LAST explicite — Postgres met les NULL en tête en ASC sinon).
 */
export async function listFollowedOutingsForCarousel(
  followerUserId: string,
  now = new Date(),
  limit = 8
) {
  return db
    .select({
      id: outings.id,
      shortId: outings.shortId,
      slug: outings.slug,
      title: outings.title,
      heroImageUrl: outings.heroImageUrl,
      createdAt: outings.createdAt,
      startsAt: outings.fixedDatetime,
      deadlineAt: outings.deadlineAt,
      status: outings.status,
      mode: outings.mode,
      creatorUserId: outings.creatorUserId,
      creatorName: user.name,
      creatorUsername: user.username,
      confirmedCount: confirmedCountSql.as("confirmed_count"),
    })
    .from(outings)
    .innerJoin(userFollows, eq(userFollows.followedUserId, outings.creatorUserId))
    .innerJoin(user, eq(user.id, outings.creatorUserId))
    .where(
      and(
        eq(userFollows.followerUserId, followerUserId),
        eq(outings.showOnProfile, true),
        ne(outings.status, "cancelled"),
        isNull(outings.hiddenFromProfileAt),
        gt(outings.deadlineAt, now),
        notExists(
          db
            .select({ id: participants.id })
            .from(participants)
            .where(
              and(eq(participants.outingId, outings.id), eq(participants.userId, followerUserId))
            )
        )
      )
    )
    .orderBy(sql`${outings.fixedDatetime} ASC NULLS LAST`, sql`${outings.deadlineAt} ASC`)
    .limit(limit);
}
