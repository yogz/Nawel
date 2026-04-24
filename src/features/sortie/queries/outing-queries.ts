import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { outings, outingTimeslots, participants } from "@drizzle/sortie-schema";

export async function getOutingByShortId(shortId: string) {
  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
    with: {
      // Creator's display name for share-preview copy ("Léa t'invite…").
      // Anon creators use `creatorAnonName` instead — the og-meta helper
      // picks whichever is set.
      creatorUser: { columns: { name: true } },
      participants: {
        orderBy: [asc(participants.respondedAt)],
        // Logged-in participants have `anonName = null` — their display name
        // lives in the `user` table. Joining it here keeps the UI layer from
        // falling back to "Quelqu'un" for creators who auto-RSVP themselves.
        with: { user: { columns: { name: true, image: true } } },
      },
      // Cheap to always fetch — fixed outings just return an empty array.
      // Votes are joined nested so the voting UI can tally per-timeslot in
      // a single render without hitting the DB again.
      timeslots: {
        orderBy: [asc(outingTimeslots.position), asc(outingTimeslots.startsAt)],
        with: { votes: true },
      },
    },
  });
  if (!outing) {
    return null;
  }
  return outing;
}

export async function getMyParticipant(args: {
  outingId: string;
  cookieTokenHash: string;
  userId: string | null;
}) {
  const byCookie = eq(participants.cookieTokenHash, args.cookieTokenHash);
  const clause = args.userId ? or(byCookie, eq(participants.userId, args.userId))! : byCookie;

  const row = await db.query.participants.findFirst({
    where: and(eq(participants.outingId, args.outingId), clause),
  });
  return row ?? null;
}

export async function listMyOutingsForProfile(userId: string, limit = 10) {
  return db
    .select({
      id: outings.id,
      shortId: outings.shortId,
      slug: outings.slug,
      title: outings.title,
      location: outings.location,
      startsAt: outings.fixedDatetime,
      deadlineAt: outings.deadlineAt,
      status: outings.status,
    })
    .from(outings)
    .where(
      and(
        eq(outings.creatorUserId, userId),
        ne(outings.status, "cancelled"),
        isNull(outings.hiddenFromProfileAt),
        gt(outings.deadlineAt, new Date())
      )
    )
    .orderBy(desc(outings.createdAt))
    .limit(limit);
}

/**
 * All outings the user created (upcoming + past), cancelled excluded.
 * Used on the Sortie home for the logged-in view, where we want to show
 * the creator every sortie they've organized regardless of the
 * `showOnProfile` flag (that flag only gates visibility on the public
 * profile).
 */
export async function listAllMyOutings(userId: string, now = new Date()) {
  const rows = await db
    .select({
      id: outings.id,
      shortId: outings.shortId,
      slug: outings.slug,
      title: outings.title,
      location: outings.location,
      startsAt: outings.fixedDatetime,
      deadlineAt: outings.deadlineAt,
      status: outings.status,
      mode: outings.mode,
      heroImageUrl: outings.heroImageUrl,
      confirmedCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${participants}
        WHERE ${participants.outingId} = ${outings.id}
          AND ${participants.response} = 'yes'
      )`.as("confirmed_count"),
    })
    .from(outings)
    .where(
      and(
        eq(outings.creatorUserId, userId),
        ne(outings.status, "cancelled"),
        isNull(outings.hiddenFromProfileAt)
      )
    )
    .orderBy(desc(outings.createdAt))
    .limit(50);

  const upcoming = rows.filter((r) => !r.startsAt || r.startsAt >= now);
  const past = rows.filter((r) => r.startsAt && r.startsAt < now);
  return { upcoming, past };
}

/**
 * Public profile view — only surfaces outings the user chose to show
 * (`showOnProfile`) and excludes cancelled ones. Splits into upcoming vs
 * past by the current time against `fixedDatetime` (vote-mode outings
 * with no chosen slot yet count as upcoming).
 *
 * `confirmedCount` is computed via a scalar sub-query rather than a
 * LEFT JOIN + GROUP BY — cleaner to compose alongside ORDER BY / LIMIT,
 * and the participants outing_id index covers the lookup.
 */
export async function listPublicProfileOutings(userId: string, now = new Date()) {
  const rows = await db
    .select({
      id: outings.id,
      shortId: outings.shortId,
      slug: outings.slug,
      title: outings.title,
      location: outings.location,
      startsAt: outings.fixedDatetime,
      deadlineAt: outings.deadlineAt,
      status: outings.status,
      mode: outings.mode,
      heroImageUrl: outings.heroImageUrl,
      confirmedCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${participants}
        WHERE ${participants.outingId} = ${outings.id}
          AND ${participants.response} = 'yes'
      )`.as("confirmed_count"),
    })
    .from(outings)
    .where(
      and(
        eq(outings.creatorUserId, userId),
        eq(outings.showOnProfile, true),
        ne(outings.status, "cancelled"),
        isNull(outings.hiddenFromProfileAt)
      )
    )
    .orderBy(desc(outings.createdAt))
    .limit(50);

  const upcoming = rows.filter((r) => !r.startsAt || r.startsAt >= now);
  const past = rows.filter((r) => r.startsAt && r.startsAt < now);
  return { upcoming, past };
}

/**
 * Archived outings — only visible to the creator in their /moi page
 * under an "Archivées" section. Cancelled outings are *not* included
 * here (cancel and archive are distinct semantics).
 */
export async function listArchivedOutings(userId: string) {
  return db
    .select({
      id: outings.id,
      shortId: outings.shortId,
      slug: outings.slug,
      title: outings.title,
      location: outings.location,
      startsAt: outings.fixedDatetime,
      deadlineAt: outings.deadlineAt,
      status: outings.status,
      hiddenFromProfileAt: outings.hiddenFromProfileAt,
    })
    .from(outings)
    .where(
      and(
        eq(outings.creatorUserId, userId),
        ne(outings.status, "cancelled"),
        isNotNull(outings.hiddenFromProfileAt)
      )
    )
    .orderBy(desc(outings.hiddenFromProfileAt))
    .limit(50);
}

/**
 * Batches participant lookups for a set of outings, identifying the viewer
 * either by their device cookie hash (anon) or their account id (logged-in).
 * Returns a `Map<outingId, participant>` — at most one participant per outing
 * per viewer, enforced by the `sortie_participants_outing_cookie_unique`
 * constraint.
 *
 * Skips the DB round-trip entirely when the viewer has no identity signal.
 */
export async function listMyParticipantsForOutings(args: {
  outingIds: string[];
  cookieTokenHash: string | null;
  userId: string | null;
}) {
  if (args.outingIds.length === 0) {
    return new Map<string, typeof participants.$inferSelect>();
  }
  if (!args.cookieTokenHash && !args.userId) {
    return new Map<string, typeof participants.$inferSelect>();
  }
  const identityClauses = [];
  if (args.cookieTokenHash) {
    identityClauses.push(eq(participants.cookieTokenHash, args.cookieTokenHash));
  }
  if (args.userId) {
    identityClauses.push(eq(participants.userId, args.userId));
  }
  const identity = identityClauses.length === 1 ? identityClauses[0]! : or(...identityClauses)!;

  const rows = await db.query.participants.findMany({
    where: and(inArray(participants.outingId, args.outingIds), identity),
  });

  const byOuting = new Map<string, typeof participants.$inferSelect>();
  for (const row of rows) {
    // A viewer can only have one participant row per outing — first hit wins
    // and the unique index prevents duplicates anyway.
    if (!byOuting.has(row.outingId)) {
      byOuting.set(row.outingId, row);
    }
  }
  return byOuting;
}
