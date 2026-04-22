import { and, asc, desc, eq, gt, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { outings, participants } from "@drizzle/sortie-schema";

/**
 * Reads the outing plus every participant row so the public page can render
 * the count and the "yes" list in a single round-trip. Returns null on miss —
 * the page converts that to a 404.
 */
export async function getOutingByShortId(shortId: string) {
  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
    with: {
      participants: {
        orderBy: [asc(participants.respondedAt)],
      },
    },
  });
  if (!outing) {
    return null;
  }
  return outing;
}

export type OutingWithParticipants = NonNullable<Awaited<ReturnType<typeof getOutingByShortId>>>;

/**
 * Looks up the participant row for the current visitor (matched by
 * cookie_token_hash OR user_id). Used by RSVP flows to pre-fill the form
 * and to short-circuit the "C'est toi ?" dedup prompt.
 */
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

/**
 * Lists upcoming outings for a logged-in user — drives the "mes sorties"
 * sidebar on the homepage. Only outings the user created are returned
 * (Phase 6 will broaden this to outings the user RSVP'd "yes" to).
 */
export async function listMyUpcomingOutings(userId: string) {
  return db.query.outings.findMany({
    where: and(eq(outings.creatorUserId, userId), gt(outings.deadlineAt, new Date())),
    orderBy: [asc(outings.deadlineAt)],
    limit: 20,
  });
}

/**
 * Bulk fetch for the "yes" names that should appear in metadata snippets.
 * Used by generateMetadata for OG preview so we can announce "N personnes
 * ont dit oui" without a second query.
 */
export async function countYesResponses(outingId: string) {
  const rows = await db
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.outingId, outingId), inArray(participants.response, ["yes"])));
  return rows.length;
}

export async function countYesAndGuests(outingId: string) {
  const rows = await db
    .select({
      id: participants.id,
      extraAdults: participants.extraAdults,
      extraChildren: participants.extraChildren,
    })
    .from(participants)
    .where(and(eq(participants.outingId, outingId), eq(participants.response, "yes")));
  let total = 0;
  for (const row of rows) {
    total += 1 + row.extraAdults + row.extraChildren;
  }
  return { confirmedRows: rows.length, totalHeadcount: total };
}

/**
 * Orders the outings table by a rough "upcoming first, recent first" heuristic
 * used by the homepage "your outings" block. Returns a minimal projection so
 * lists stay fast without loading the participant graph.
 */
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
    .where(eq(outings.creatorUserId, userId))
    .orderBy(desc(outings.createdAt))
    .limit(limit);
}
