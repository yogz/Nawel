import { and, asc, desc, eq, gt, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { outings, outingTimeslots, participants } from "@drizzle/sortie-schema";

export async function getOutingByShortId(shortId: string) {
  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
    with: {
      participants: {
        orderBy: [asc(participants.respondedAt)],
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
        gt(outings.deadlineAt, new Date())
      )
    )
    .orderBy(desc(outings.createdAt))
    .limit(limit);
}
