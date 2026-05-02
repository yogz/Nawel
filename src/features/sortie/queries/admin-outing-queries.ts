import { desc, sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { outings, outingStatus, outingMode, participants } from "@drizzle/sortie-schema";
import { user } from "@drizzle/schema";
import { confirmedCountSql } from "@/features/sortie/queries/outing-queries";

export type OutingStatus = (typeof outingStatus.enumValues)[number];
export type OutingMode = (typeof outingMode.enumValues)[number];

export type AdminOutingRow = {
  id: string;
  shortId: string;
  title: string;
  status: OutingStatus;
  mode: OutingMode;
  fixedDatetime: Date | null;
  deadlineAt: Date;
  cancelledAt: Date | null;
  createdAt: Date;
  creator: { name: string; email: string | null; isAnon: boolean };
  confirmedCount: number;
};

/**
 * Liste admin paginée des sorties (plus récentes d'abord). On expose
 * tout : ouvert, annulé, settled. C'est de la supervision — pas de
 * filtre côté query, le filtrage est UI.
 */
export async function listAdminOutings({
  limit = 30,
  offset = 0,
}: { limit?: number; offset?: number } = {}): Promise<AdminOutingRow[]> {
  const rows = await db
    .select({
      id: outings.id,
      shortId: outings.shortId,
      title: outings.title,
      status: outings.status,
      mode: outings.mode,
      fixedDatetime: outings.fixedDatetime,
      deadlineAt: outings.deadlineAt,
      cancelledAt: outings.cancelledAt,
      createdAt: outings.createdAt,
      creatorUserId: outings.creatorUserId,
      creatorAnonName: outings.creatorAnonName,
      creatorAnonEmail: outings.creatorAnonEmail,
      creatorUserName: user.name,
      creatorUserEmail: user.email,
      confirmedCount: confirmedCountSql,
    })
    .from(outings)
    .leftJoin(user, eq(outings.creatorUserId, user.id))
    .orderBy(desc(outings.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    shortId: r.shortId,
    title: r.title,
    status: r.status,
    mode: r.mode,
    fixedDatetime: r.fixedDatetime,
    deadlineAt: r.deadlineAt,
    cancelledAt: r.cancelledAt,
    createdAt: r.createdAt,
    confirmedCount: r.confirmedCount,
    creator: r.creatorUserId
      ? { name: r.creatorUserName ?? "—", email: r.creatorUserEmail ?? null, isAnon: false }
      : { name: r.creatorAnonName ?? "anon", email: r.creatorAnonEmail ?? null, isAnon: true },
  }));
}

export async function countAdminOutings(): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(outings);
  return row?.n ?? 0;
}
