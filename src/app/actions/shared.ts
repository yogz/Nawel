"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { assertWriteAccess } from "@/lib/auth";
import { events, changeLogs, people, meals, services, items } from "@drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { validateSchema, getChangeLogsSchema } from "./schemas";
import { withErrorThrower } from "@/lib/action-utils";

// Helper to verify access against event by slug
export async function verifyEventAccess(slug: string, key?: string | null) {
  const event = await db.query.events.findFirst({ where: eq(events.slug, slug) });
  if (!event) throw new Error("Event not found");
  assertWriteAccess(key, event.adminKey);
  return event;
}

export const validateWriteKeyAction = withErrorThrower(
  async (input: z.infer<typeof validateSchema>) => {
    if (!input.slug) return false;
    const event = await db.query.events.findFirst({ where: eq(events.slug, input.slug) });
    if (!event || !event.adminKey) return false;
    return input.key === event.adminKey;
  }
);

export const getChangeLogsAction = withErrorThrower(
  async (input: z.infer<typeof getChangeLogsSchema>) => {
    const event = await db.query.events.findFirst({ where: eq(events.slug, input.slug) });
    if (!event) return [];

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
        if (log.tableName === "events") return log.recordId === event.id;
        if (log.tableName === "people") return peopleIds.has(log.recordId);
        if (log.tableName === "meals") return mealsIds.has(log.recordId);
        if (log.tableName === "services") return servicesIds.has(log.recordId);
        if (log.tableName === "items") return itemsIds.has(log.recordId);
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
