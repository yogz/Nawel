"use server";

import { db } from "@/lib/db";
import { changeLogs, user } from "@drizzle/schema";
import { desc, eq, SQL, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { createSafeAction } from "@/lib/action-utils";
import {
  getAuditLogsSchema,
  deleteAuditLogsSchema,
  auditTableNames,
  auditActions,
} from "./schemas";

export type AuditLogEntry = typeof changeLogs.$inferSelect & {
  userName?: string | null;
  userEmail?: string | null;
};

export const getAuditLogsAction = createSafeAction(getAuditLogsSchema, async (input) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const where: (SQL | undefined)[] = [];

  // Input is now validated by Zod - types are safe
  if (input.tableName) {
    where.push(eq(changeLogs.tableName, input.tableName));
  }
  if (input.action) {
    where.push(eq(changeLogs.action, input.action));
  }
  if (input.userId) {
    where.push(eq(changeLogs.userId, input.userId));
  }

  const logs = await db
    .select({
      id: changeLogs.id,
      action: changeLogs.action,
      tableName: changeLogs.tableName,
      recordId: changeLogs.recordId,
      userId: changeLogs.userId,
      oldData: changeLogs.oldData,
      newData: changeLogs.newData,
      userIp: changeLogs.userIp,
      userAgent: changeLogs.userAgent,
      referer: changeLogs.referer,
      createdAt: changeLogs.createdAt,
      userName: user.name,
      userEmail: user.email,
    })
    .from(changeLogs)
    .leftJoin(user, eq(changeLogs.userId, user.id))
    .where(and(...where))
    .orderBy(desc(changeLogs.createdAt))
    .limit(100);

  return logs;
});

export const deleteAuditLogsAction = createSafeAction(deleteAuditLogsSchema, async (input) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  if (input.deleteAll) {
    await db.delete(changeLogs);
    return { success: true, count: null };
  }

  if (input.olderThanDays !== undefined) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - input.olderThanDays);

    await db.delete(changeLogs).where(sql`${changeLogs.createdAt} < ${cutoff.toISOString()}`);

    return { success: true };
  }

  throw new Error("Invalid options provided for deletion");
});
