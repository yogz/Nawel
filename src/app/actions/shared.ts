"use server";

import { type z } from "zod";
import { db } from "@/lib/db";
import {
  assertEventWriteAccess,
  hasEventWriteAccess,
  buildPermissionContext,
  assertCan,
  can,
  type ActionType,
  type PermissionContext,
} from "@/lib/permissions";
import { events, changeLogs, people, meals } from "@drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { type validateSchema, type getChangeLogsSchema } from "./schemas";
import { withErrorThrower } from "@/lib/action-utils";

// ============================================================================
// NEW: Centralized Access Verification
// ============================================================================

/**
 * Verify access for a specific action with full permission context
 *
 * @param slug - Event slug
 * @param action - The action to verify
 * @param key - Admin key (from URL)
 * @param personToken - Person token (from localStorage)
 * @returns event and permission context
 */
export async function verifyAccess(
  slug: string,
  action: ActionType,
  key?: string | null,
  personToken?: string | null
): Promise<{
  event: NonNullable<Awaited<ReturnType<typeof db.query.events.findFirst>>>;
  ctx: PermissionContext;
}> {
  const event = await db.query.events.findFirst({ where: eq(events.slug, slug) });
  if (!event) {
    throw new Error("Event not found");
  }

  const ctx = await buildPermissionContext(event, key, personToken);
  assertCan(action, ctx);

  return { event, ctx };
}

/**
 * Check if user has access without throwing
 */
export async function hasAccess(
  slug: string,
  action: ActionType,
  key?: string | null,
  personToken?: string | null
): Promise<boolean> {
  const event = await db.query.events.findFirst({ where: eq(events.slug, slug) });
  if (!event) {
    return false;
  }

  const ctx = await buildPermissionContext(event, key, personToken);
  return can(action, ctx);
}

// ============================================================================
// LEGACY: Backward Compatibility
// ============================================================================

/**
 * @deprecated Use verifyAccess(slug, action, key, token) instead
 */
export async function verifyEventAccess(slug: string, key?: string | null) {
  const event = await db.query.events.findFirst({ where: eq(events.slug, slug) });
  if (!event) {
    throw new Error("Event not found");
  }
  await assertEventWriteAccess(key, event);
  return event;
}

export const validateWriteKeyAction = withErrorThrower(
  async (input: z.infer<typeof validateSchema>) => {
    if (!input.slug) {
      return false;
    }
    const event = await db.query.events.findFirst({ where: eq(events.slug, input.slug) });
    if (!event) {
      return false;
    }
    return hasEventWriteAccess(input.key, event, input.token);
  }
);

export const getChangeLogsAction = withErrorThrower(
  async (input: z.infer<typeof getChangeLogsSchema>) => {
    const event = await db.query.events.findFirst({ where: eq(events.slug, input.slug) });
    if (!event) {
      return [];
    }

    const allLogs = await db
      .select()
      .from(changeLogs)
      .orderBy(desc(changeLogs.createdAt))
      .limit(200);

    const logsByTable: Record<string, typeof allLogs> = {
      events: [],
      people: [],
      meals: [],
      services: [],
      items: [],
    };

    for (const log of allLogs) {
      if (logsByTable[log.tableName]) {
        logsByTable[log.tableName].push(log);
      }
    }

    const [peopleRecords, mealsRecords, servicesRecords, itemsRecords] = await Promise.all([
      logsByTable.people.length > 0
        ? db.query.people.findMany({
            where: eq(people.eventId, event.id),
          })
        : [],
      logsByTable.meals.length > 0
        ? db.query.meals.findMany({
            where: eq(meals.eventId, event.id),
          })
        : [],
      logsByTable.services.length > 0
        ? db.query.services.findMany({
            with: { meal: true },
          })
        : [],
      logsByTable.items.length > 0
        ? db.query.items.findMany({
            with: { service: { with: { meal: true } } },
          })
        : [],
    ]);

    const peopleIds = new Set(peopleRecords.map((p) => p.id));
    const mealsIds = new Set(mealsRecords.map((m) => m.id));
    const servicesIds = new Set(
      servicesRecords.filter((s) => s.meal?.eventId === event.id).map((s) => s.id)
    );
    const itemsIds = new Set(
      itemsRecords.filter((i) => i.service?.meal?.eventId === event.id).map((i) => i.id)
    );

    const filteredLogs = allLogs
      .filter((log) => {
        if (log.tableName === "events") {
          return log.recordId === event.id;
        }
        if (log.tableName === "people") {
          return peopleIds.has(log.recordId);
        }
        if (log.tableName === "meals") {
          return mealsIds.has(log.recordId);
        }
        if (log.tableName === "services") {
          return servicesIds.has(log.recordId);
        }
        if (log.tableName === "items") {
          return itemsIds.has(log.recordId);
        }
        return false;
      })
      .slice(0, 100);

    return filteredLogs.map((log) => ({
      ...log,
      oldData: log.oldData ? JSON.parse(log.oldData) : null,
      newData: log.newData ? JSON.parse(log.newData) : null,
    }));
  }
);
