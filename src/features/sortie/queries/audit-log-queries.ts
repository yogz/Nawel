import "server-only";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { auditLog, outings } from "@drizzle/sortie-schema";
import { desc, eq } from "drizzle-orm";

export type AuditLogEntry = {
  id: string;
  createdAt: Date;
  action: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  outingId: string | null;
  outingShortId: string | null;
  outingTitle: string | null;
  payload: string | null;
};

// Lecture paginée du audit log Sortie. JOIN sur `user` pour l'email de
// l'acteur (NULL si la row a été créée avec actorUserId=null — script
// auto, ou row pré-2FA-reset). JOIN sur `outings` pour matérialiser le
// shortId/title quand la row a un `outingId` (rows admin-debt-actions
// + admin-assign-actions ont un outingId, les rows user/2FA n'en ont pas).
//
// Pagination offset (pas cursor) — au volume actuel < quelques centaines
// de rows, pas de gain à passer en cursor.
export async function listAuditLog({
  limit,
  offset,
}: {
  limit: number;
  offset: number;
}): Promise<AuditLogEntry[]> {
  const rows = await db
    .select({
      id: auditLog.id,
      createdAt: auditLog.createdAt,
      action: auditLog.action,
      actorUserId: auditLog.actorUserId,
      actorEmail: user.email,
      actorName: user.name,
      outingId: auditLog.outingId,
      outingShortId: outings.shortId,
      outingTitle: outings.title,
      payload: auditLog.payload,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorUserId))
    .leftJoin(outings, eq(outings.id, auditLog.outingId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function countAuditLog(): Promise<number> {
  const rows = await db.$count(auditLog);
  return rows;
}
