"use server";

import { db } from "@/lib/db";
import { changeLogs, user } from "@drizzle/schema";
import { desc, eq, SQL, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { withErrorThrower } from "@/lib/action-utils";

export type AuditLogEntry = typeof changeLogs.$inferSelect & {
  userName?: string | null;
  userEmail?: string | null;
};

export const getAuditLogsAction = withErrorThrower(
  async (filters?: { tableName?: string; action?: string; userId?: string }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const where: (SQL | undefined)[] = [];

    if (filters?.tableName) {
      where.push(eq(changeLogs.tableName, filters.tableName as any));
    }
    if (filters?.action) {
      where.push(eq(changeLogs.action, filters.action as any));
    }
    if (filters?.userId) {
      where.push(eq(changeLogs.userId, filters.userId));
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
  }
);
