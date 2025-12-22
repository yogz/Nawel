"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertWriteAccess } from "@/lib/auth";
import { logChange } from "@/lib/logger";
import { changeLogs, days, items, meals, people, events } from "@/drizzle/schema";
import { asc, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const baseInput = z.object({
  key: z.string().optional(),
  slug: z.string(),
});

// Helper to verify access against event by slug
async function verifyEventAccess(slug: string, key?: string | null) {
  const event = await db.query.events.findFirst({ where: eq(events.slug, slug) });
  if (!event) throw new Error("Event not found");
  assertWriteAccess(key, event.adminKey);
  return event;
}

const createDaySchema = baseInput.extend({
  date: z.string().min(1, "Date required"),
  title: z.string().optional(),
});

export async function createDayAction(input: z.infer<typeof createDaySchema>) {
  const event = await verifyEventAccess(input.slug, input.key);
  const [created] = await db
    .insert(days)
    .values({ eventId: event.id, date: input.date, title: input.title ?? null })
    .returning();
  await logChange("create", "days", created.id, null, created);
  revalidatePath(`/event/${input.slug}`);
  return created;
}

const createMealSchema = baseInput.extend({
  dayId: z.number(),
  title: z.string().min(1, "Title required"),
});

export async function createMealAction(input: z.infer<typeof createMealSchema>) {
  await verifyEventAccess(input.slug, input.key);
  const [last] = await db
    .select({ value: meals.order })
    .from(meals)
    .where(eq(meals.dayId, input.dayId))
    .orderBy(desc(meals.order))
    .limit(1);
  const lastOrder = last?.value ?? 0;
  const [created] = await db
    .insert(meals)
    .values({ dayId: input.dayId, title: input.title, order: lastOrder + 1 })
    .returning();
  await logChange("create", "meals", created.id, null, created);
  revalidatePath(`/event/${input.slug}`);
  return created;
}

const mealSchema = baseInput.extend({ id: z.number(), title: z.string().min(1) });
export async function updateMealTitleAction(input: z.infer<typeof mealSchema>) {
  await verifyEventAccess(input.slug, input.key);
  const [oldData] = await db.select().from(meals).where(eq(meals.id, input.id)).limit(1);
  await db.update(meals).set({ title: input.title }).where(eq(meals.id, input.id));
  const [newData] = await db.select().from(meals).where(eq(meals.id, input.id)).limit(1);
  await logChange("update", "meals", input.id, oldData || undefined, newData || undefined);
  revalidatePath(`/event/${input.slug}`);
}

const deleteMealSchema = baseInput.extend({ id: z.number() });
export async function deleteMealAction(input: z.infer<typeof deleteMealSchema>) {
  await verifyEventAccess(input.slug, input.key);
  const [oldData] = await db.select().from(meals).where(eq(meals.id, input.id)).limit(1);
  await db.delete(meals).where(eq(meals.id, input.id));
  await logChange("delete", "meals", input.id, oldData || undefined);
  revalidatePath(`/event/${input.slug}`);
}

const createPersonSchema = baseInput.extend({ name: z.string().min(1), emoji: z.string().optional() });
export async function createPersonAction(input: z.infer<typeof createPersonSchema>) {
  try {
    const event = await verifyEventAccess(input.slug, input.key);
    const [created] = await db.insert(people).values({
      eventId: event.id,
      name: input.name,
      emoji: input.emoji ?? null,
    }).returning();

    await logChange("create", "people", created.id, null, created);
    revalidatePath(`/event/${input.slug}`);
    return created;
  } catch (error) {
    console.error("Error in createPersonAction:", error);
    throw error instanceof Error ? error : new Error("An unknown error occurred while adding the person");
  }
}

const updatePersonSchema = baseInput.extend({
  id: z.number(),
  name: z.string().min(1),
  emoji: z.string().optional().nullable(),
});

export async function updatePersonAction(input: z.infer<typeof updatePersonSchema>) {
  await verifyEventAccess(input.slug, input.key);
  const [oldData] = await db.select().from(people).where(eq(people.id, input.id)).limit(1);
  await db
    .update(people)
    .set({
      name: input.name,
      emoji: input.emoji ?? null,
    })
    .where(eq(people.id, input.id));
  const [newData] = await db.select().from(people).where(eq(people.id, input.id)).limit(1);
  await logChange("update", "people", input.id, oldData || undefined, newData || undefined);
  revalidatePath(`/event/${input.slug}`);
}

const deletePersonSchema = baseInput.extend({ id: z.number() });
export async function deletePersonAction(input: z.infer<typeof deletePersonSchema>) {
  await verifyEventAccess(input.slug, input.key);
  const [oldData] = await db.select().from(people).where(eq(people.id, input.id)).limit(1);
  await db.delete(people).where(eq(people.id, input.id));
  await logChange("delete", "people", input.id, oldData || undefined);
  revalidatePath(`/event/${input.slug}`);
}

const createItemSchema = baseInput.extend({
  mealId: z.number(),
  name: z.string().min(1),
  quantity: z.string().optional(),
  note: z.string().optional(),
  price: z.number().optional(),
});

export async function createItemAction(input: z.infer<typeof createItemSchema>) {
  await verifyEventAccess(input.slug, input.key);
  const [last] = await db
    .select()
    .from(items)
    .where(eq(items.mealId, input.mealId))
    .orderBy(desc(items.order))
    .limit(1);
  const [created] = await db
    .insert(items)
    .values({
      mealId: input.mealId,
      name: input.name,
      quantity: input.quantity,
      note: input.note,
      price: input.price ?? null,
      order: (last?.order || 0) + 1,
    })
    .returning();
  await logChange("create", "items", created.id, null, created);
  revalidatePath(`/event/${input.slug}`);
  return created;
}

const updateItemSchema = baseInput.extend({
  id: z.number(),
  name: z.string().min(1),
  quantity: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  price: z.number().optional().nullable(),
  personId: z.number().optional().nullable(),
});

export async function updateItemAction(input: z.infer<typeof updateItemSchema>) {
  await verifyEventAccess(input.slug, input.key);
  const [oldData] = await db.select().from(items).where(eq(items.id, input.id)).limit(1);
  await db
    .update(items)
    .set({
      name: input.name,
      quantity: input.quantity ?? null,
      note: input.note ?? null,
      price: input.price ?? null,
      personId: input.personId ?? null,
    })
    .where(eq(items.id, input.id));
  const [newData] = await db.select().from(items).where(eq(items.id, input.id)).limit(1);
  await logChange("update", "items", input.id, oldData || undefined, newData || undefined);
  revalidatePath(`/event/${input.slug}`);
}

const deleteItemSchema = baseInput.extend({ id: z.number() });
export async function deleteItemAction(input: z.infer<typeof deleteItemSchema>) {
  await verifyEventAccess(input.slug, input.key);
  const [oldData] = await db.select().from(items).where(eq(items.id, input.id)).limit(1);
  await db.delete(items).where(eq(items.id, input.id));
  await logChange("delete", "items", input.id, oldData || undefined);
  revalidatePath(`/event/${input.slug}`);
}

const assignItemSchema = baseInput.extend({ id: z.number(), personId: z.number().nullable() });
export async function assignItemAction(input: z.infer<typeof assignItemSchema>) {
  await verifyEventAccess(input.slug, input.key);
  const [oldData] = await db.select().from(items).where(eq(items.id, input.id)).limit(1);
  await db.update(items).set({ personId: input.personId }).where(eq(items.id, input.id));
  const [newData] = await db.select().from(items).where(eq(items.id, input.id)).limit(1);
  await logChange("update", "items", input.id, oldData || undefined, newData || undefined);
  revalidatePath(`/event/${input.slug}`);
}

const reorderSchema = baseInput.extend({ mealId: z.number(), itemIds: z.array(z.number()) });
export async function reorderItemsAction(input: z.infer<typeof reorderSchema>) {
  await verifyEventAccess(input.slug, input.key);
  const updates = input.itemIds.map((id, index) =>
    db.update(items).set({ order: index }).where(eq(items.id, id))
  );
  for (const query of updates) {
    await query;
  }
  revalidatePath(`/event/${input.slug}`);
}

const moveItemSchema = baseInput.extend({
  itemId: z.number(),
  targetMealId: z.number(),
  targetOrder: z.number().optional(),
});
export async function moveItemAction(input: z.infer<typeof moveItemSchema>) {
  await verifyEventAccess(input.slug, input.key);
  const [item] = await db.select().from(items).where(eq(items.id, input.itemId)).limit(1);
  if (!item) return;

  const oldMealId = item.mealId;

  if (oldMealId === input.targetMealId) {
    revalidatePath(`/event/${input.slug}`);
    return;
  }

  const targetMealItems = await db
    .select()
    .from(items)
    .where(eq(items.mealId, input.targetMealId))
    .orderBy(asc(items.order));

  let newOrder: number;
  if (input.targetOrder !== undefined && input.targetOrder < targetMealItems.length) {
    newOrder = input.targetOrder;
    for (const targetItem of targetMealItems) {
      if (targetItem.order >= newOrder) {
        await db.update(items).set({ order: targetItem.order + 1 }).where(eq(items.id, targetItem.id));
      }
    }
  } else {
    const [last] = await db
      .select()
      .from(items)
      .where(eq(items.mealId, input.targetMealId))
      .orderBy(desc(items.order))
      .limit(1);
    newOrder = (last?.order || 0) + 1;
  }

  const oldData = { ...item };
  await db
    .update(items)
    .set({ mealId: input.targetMealId, order: newOrder })
    .where(eq(items.id, input.itemId));
  const [newData] = await db.select().from(items).where(eq(items.id, input.itemId)).limit(1);
  await logChange("update", "items", input.itemId, oldData, newData || undefined);

  const oldMealItems = await db
    .select()
    .from(items)
    .where(eq(items.mealId, oldMealId))
    .orderBy(asc(items.order));
  for (let i = 0; i < oldMealItems.length; i++) {
    await db.update(items).set({ order: i }).where(eq(items.id, oldMealItems[i].id));
  }

  const newMealItems = await db
    .select()
    .from(items)
    .where(eq(items.mealId, input.targetMealId))
    .orderBy(asc(items.order));
  for (let i = 0; i < newMealItems.length; i++) {
    await db.update(items).set({ order: i }).where(eq(items.id, newMealItems[i].id));
  }

  revalidatePath(`/event/${input.slug}`);
}

const validateSchema = z.object({ key: z.string().optional(), slug: z.string().optional() });
export async function validateWriteKeyAction(input: z.infer<typeof validateSchema>) {
  if (!input.slug) return false;
  const event = await db.query.events.findFirst({ where: eq(events.slug, input.slug) });
  if (!event || !event.adminKey) return false;
  return input.key === event.adminKey;
}

const getChangeLogsSchema = z.object({ slug: z.string() });
export async function getChangeLogsAction(input: z.infer<typeof getChangeLogsSchema>) {
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
    days: [],
    meals: [],
    items: [],
  };

  for (const log of allLogs) {
    if (logsByTable[log.tableName]) {
      logsByTable[log.tableName].push(log);
    }
  }

  const [peopleRecords, daysRecords, mealsRecords, itemsRecords] = await Promise.all([
    logsByTable.people.length > 0
      ? db.query.people.findMany({
        where: eq(people.eventId, event.id),
      })
      : [],
    logsByTable.days.length > 0
      ? db.query.days.findMany({
        where: eq(days.eventId, event.id),
      })
      : [],
    logsByTable.meals.length > 0
      ? db.query.meals.findMany({
        with: { day: true },
      })
      : [],
    logsByTable.items.length > 0
      ? db.query.items.findMany({
        with: { meal: { with: { day: true } } },
      })
      : [],
  ]);

  const peopleIds = new Set(peopleRecords.map((p) => p.id));
  const daysIds = new Set(daysRecords.map((d) => d.id));
  const mealsIds = new Set(
    mealsRecords.filter((m) => m.day?.eventId === event.id).map((m) => m.id)
  );
  const itemsIds = new Set(
    itemsRecords.filter((i) => i.meal?.day?.eventId === event.id).map((i) => i.id)
  );

  const filteredLogs = allLogs.filter((log) => {
    if (log.tableName === 'events') return log.recordId === event.id;
    if (log.tableName === 'people') return peopleIds.has(log.recordId);
    if (log.tableName === 'days') return daysIds.has(log.recordId);
    if (log.tableName === 'meals') return mealsIds.has(log.recordId);
    if (log.tableName === 'items') return itemsIds.has(log.recordId);
    return false;
  }).slice(0, 100);

  return filteredLogs.map((log) => ({
    ...log,
    oldData: log.oldData ? JSON.parse(log.oldData) : null,
    newData: log.newData ? JSON.parse(log.newData) : null,
  }));
}

const createEventSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1),
  description: z.string().optional(),
  key: z.string().optional(),
});

export async function createEventAction(input: z.infer<typeof createEventSchema>) {
  // Public action, generates new adminKey
  const adminKey = randomUUID();
  const [created] = await db
    .insert(events)
    .values({
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      adminKey: adminKey,
    })
    .returning();
  await logChange("create", "events", created.id, null, created);
  revalidatePath("/");
  return created;
}

export async function getAllEventsAction() {
  return await db
    .select()
    .from(events)
    .orderBy(desc(events.createdAt));
}
