import { desc, sql, or, ilike, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { outings, participants } from "@drizzle/sortie-schema";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: "user" | "admin";
  banned: boolean;
  banReason: string | null;
  createdAt: Date;
  outingsCreated: number;
  rsvpCount: number;
};

const outingsCreatedSql = sql<number>`(
  SELECT COUNT(*)::int FROM ${outings}
  WHERE ${outings.creatorUserId} = ${user.id}
)`;

const rsvpCountSql = sql<number>`(
  SELECT COUNT(*)::int FROM ${participants}
  WHERE ${participants.userId} = ${user.id}
)`;

/**
 * Recherche admin de users. Match insensible à la casse sur email,
 * username ou nom. Si `q` vide : retourne les plus récemment créés.
 */
export async function searchAdminUsers({
  q,
  limit = 30,
}: { q?: string; limit?: number } = {}): Promise<AdminUserRow[]> {
  const trimmed = (q ?? "").trim();
  const where: SQL | undefined = trimmed
    ? or(
        ilike(user.email, `%${trimmed}%`),
        ilike(user.username, `%${trimmed}%`),
        ilike(user.name, `%${trimmed}%`)
      )
    : undefined;

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      createdAt: user.createdAt,
      outingsCreated: outingsCreatedSql,
      rsvpCount: rsvpCountSql,
    })
    .from(user)
    .where(where)
    .orderBy(desc(user.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    username: r.username,
    role: r.role === "admin" ? "admin" : "user",
    banned: r.banned ?? false,
    banReason: r.banReason,
    createdAt: r.createdAt,
    outingsCreated: r.outingsCreated,
    rsvpCount: r.rsvpCount,
  }));
}

export async function countUsers(): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(user);
  return row?.n ?? 0;
}
