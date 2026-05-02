import { and, asc, desc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { outings, participants, userFollows } from "@drizzle/sortie-schema";
import { user } from "@drizzle/schema";

export async function isFollowing(args: {
  followerUserId: string;
  followedUserId: string;
}): Promise<boolean> {
  const row = await db
    .select({ one: sql<number>`1` })
    .from(userFollows)
    .where(
      and(
        eq(userFollows.followerUserId, args.followerUserId),
        eq(userFollows.followedUserId, args.followedUserId)
      )
    )
    .limit(1);
  return row.length > 0;
}

export type FollowerRow = {
  followerUserId: string;
  createdAt: Date;
  name: string;
  username: string | null;
  image: string | null;
};

export async function listFollowers(followedUserId: string): Promise<FollowerRow[]> {
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

export type FollowedCarouselOuting = {
  id: string;
  shortId: string;
  slug: string | null;
  title: string;
  heroImageUrl: string | null;
  fixedDatetime: Date | null;
  deadlineAt: Date;
  creatorName: string;
  creatorUsername: string | null;
};

/**
 * Sorties à afficher dans le carrousel "des suivis suivent" sur la home.
 * Filtres :
 *   - créateur dans les follows du viewer (INNER JOIN userFollows)
 *   - showOnProfile = true, non-cancelled, non archivée
 *   - deadlineAt > now (la sortie peut encore être rejointe)
 *   - NOT EXISTS sur participants (followerUserId, outingId) pour
 *     éviter de doubler les sorties déjà dans <HomeMonthAgenda>
 *
 * Tri `fixedDatetime ASC NULLS LAST` puis `deadlineAt ASC` : les sorties
 * datées remontent, les sondages (fixedDatetime = null) glissent en
 * fin de carrousel mais restent visibles.
 */
export async function listFollowedOutingsForCarousel(
  followerUserId: string,
  now: Date,
  limit = 8
): Promise<FollowedCarouselOuting[]> {
  return db
    .select({
      id: outings.id,
      shortId: outings.shortId,
      slug: outings.slug,
      title: outings.title,
      heroImageUrl: outings.heroImageUrl,
      fixedDatetime: outings.fixedDatetime,
      deadlineAt: outings.deadlineAt,
      creatorName: user.name,
      creatorUsername: user.username,
    })
    .from(outings)
    .innerJoin(user, eq(user.id, outings.creatorUserId))
    .innerJoin(
      userFollows,
      and(eq(userFollows.followedUserId, user.id), eq(userFollows.followerUserId, followerUserId))!
    )
    .where(
      and(
        ne(outings.status, "cancelled"),
        eq(outings.showOnProfile, true),
        isNull(outings.hiddenFromProfileAt),
        gt(outings.deadlineAt, now),
        sql`NOT EXISTS (
          SELECT 1 FROM ${participants}
          WHERE ${participants}.outing_id = ${outings}.id
            AND ${participants}.user_id = ${followerUserId}
        )`
      )
    )
    .orderBy(sql`${outings.fixedDatetime} ASC NULLS LAST`, asc(outings.deadlineAt))
    .limit(limit);
}
