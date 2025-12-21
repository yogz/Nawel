"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertWriteAccess } from "@/lib/auth";
import { logChange } from "@/lib/logger";
import { changeLogs, days, items, meals, people } from "@/drizzle/schema";
import { asc, desc, eq } from "drizzle-orm";

const baseInput = z.object({
  key: z.string().optional(),
  slug: z.string(),
});

const createDaySchema = baseInput.extend({
  date: z.string().min(1, "Date required"),
  title: z.string().optional(),
});

export async function createDayAction(input: z.infer<typeof createDaySchema>) {
  assertWriteAccess(input.key);
  const [created] = await db
    .insert(days)
    .values({ date: input.date, title: input.title ?? null })
    .returning();
  await logChange("create", "days", created.id, null, created);
  revalidatePath(`/noel/${input.slug}`);
  return created;
}

const createMealSchema = baseInput.extend({
  dayId: z.number(),
  title: z.string().min(1, "Title required"),
});

export async function createMealAction(input: z.infer<typeof createMealSchema>) {
  assertWriteAccess(input.key);
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
  revalidatePath(`/noel/${input.slug}`);
  return created;
}

const mealSchema = baseInput.extend({ id: z.number(), title: z.string().min(1) });
export async function updateMealTitleAction(input: z.infer<typeof mealSchema>) {
  assertWriteAccess(input.key);
  const [oldData] = await db.select().from(meals).where(eq(meals.id, input.id)).limit(1);
  await db.update(meals).set({ title: input.title }).where(eq(meals.id, input.id));
  const [newData] = await db.select().from(meals).where(eq(meals.id, input.id)).limit(1);
  await logChange("update", "meals", input.id, oldData || undefined, newData || undefined);
  revalidatePath(`/noel/${input.slug}`);
}

const deleteMealSchema = baseInput.extend({ id: z.number() });
export async function deleteMealAction(input: z.infer<typeof deleteMealSchema>) {
  assertWriteAccess(input.key);
  const [oldData] = await db.select().from(meals).where(eq(meals.id, input.id)).limit(1);
  await db.delete(meals).where(eq(meals.id, input.id));
  await logChange("delete", "meals", input.id, oldData || undefined);
  revalidatePath(`/noel/${input.slug}`);
}

const createPersonSchema = baseInput.extend({ name: z.string().min(1) });
export async function createPersonAction(input: z.infer<typeof createPersonSchema>) {
  assertWriteAccess(input.key);
  const [created] = await db.insert(people).values({ name: input.name }).returning();
  await logChange("create", "people", created.id, null, created);
  revalidatePath(`/noel/${input.slug}`);
  return created;
}

const createItemSchema = baseInput.extend({
  mealId: z.number(),
  name: z.string().min(1),
  quantity: z.string().optional(),
  note: z.string().optional(),
});

export async function createItemAction(input: z.infer<typeof createItemSchema>) {
  assertWriteAccess(input.key);
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
      order: (last?.order || 0) + 1,
    })
    .returning();
  await logChange("create", "items", created.id, null, created);
  revalidatePath(`/noel/${input.slug}`);
  return created;
}

const updateItemSchema = baseInput.extend({
  id: z.number(),
  name: z.string().min(1),
  quantity: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  personId: z.number().optional().nullable(),
});

export async function updateItemAction(input: z.infer<typeof updateItemSchema>) {
  assertWriteAccess(input.key);
  // Récupérer les données avant la mise à jour
  const [oldData] = await db.select().from(items).where(eq(items.id, input.id)).limit(1);
  await db
    .update(items)
    .set({
      name: input.name,
      quantity: input.quantity ?? null,
      note: input.note ?? null,
      personId: input.personId ?? null,
    })
    .where(eq(items.id, input.id));
  // Récupérer les données après la mise à jour
  const [newData] = await db.select().from(items).where(eq(items.id, input.id)).limit(1);
  await logChange("update", "items", input.id, oldData || undefined, newData || undefined);
  revalidatePath(`/noel/${input.slug}`);
}

const deleteItemSchema = baseInput.extend({ id: z.number() });
export async function deleteItemAction(input: z.infer<typeof deleteItemSchema>) {
  assertWriteAccess(input.key);
  // Récupérer les données avant la suppression
  const [oldData] = await db.select().from(items).where(eq(items.id, input.id)).limit(1);
  await db.delete(items).where(eq(items.id, input.id));
  await logChange("delete", "items", input.id, oldData || undefined);
  revalidatePath(`/noel/${input.slug}`);
}

const assignItemSchema = baseInput.extend({ id: z.number(), personId: z.number().nullable() });
export async function assignItemAction(input: z.infer<typeof assignItemSchema>) {
  assertWriteAccess(input.key);
  const [oldData] = await db.select().from(items).where(eq(items.id, input.id)).limit(1);
  await db.update(items).set({ personId: input.personId }).where(eq(items.id, input.id));
  const [newData] = await db.select().from(items).where(eq(items.id, input.id)).limit(1);
  await logChange("update", "items", input.id, oldData || undefined, newData || undefined);
  revalidatePath(`/noel/${input.slug}`);
}

const reorderSchema = baseInput.extend({ mealId: z.number(), itemIds: z.array(z.number()) });
export async function reorderItemsAction(input: z.infer<typeof reorderSchema>) {
  assertWriteAccess(input.key);
  const updates = input.itemIds.map((id, index) =>
    db.update(items).set({ order: index }).where(eq(items.id, id))
  );
  for (const query of updates) {
    await query;
  }
  revalidatePath(`/noel/${input.slug}`);
}

const moveItemSchema = baseInput.extend({
  itemId: z.number(),
  targetMealId: z.number(),
  targetOrder: z.number().optional(),
});
export async function moveItemAction(input: z.infer<typeof moveItemSchema>) {
  assertWriteAccess(input.key);
  // Get the item to move
  const [item] = await db.select().from(items).where(eq(items.id, input.itemId)).limit(1);
  if (!item) return;

  const oldMealId = item.mealId;

  // If moving to the same meal, just reorder (handled by reorderItemsAction)
  if (oldMealId === input.targetMealId) {
    revalidatePath(`/noel/${input.slug}`);
    return;
  }

  // Get all items in target meal
  const targetMealItems = await db
    .select()
    .from(items)
    .where(eq(items.mealId, input.targetMealId))
    .orderBy(asc(items.order));

  // Calculate new order
  let newOrder: number;
  if (input.targetOrder !== undefined && input.targetOrder < targetMealItems.length) {
    newOrder = input.targetOrder;
    // Shift items at and after targetOrder
    for (const targetItem of targetMealItems) {
      if (targetItem.order >= newOrder) {
        await db.update(items).set({ order: targetItem.order + 1 }).where(eq(items.id, targetItem.id));
      }
    }
  } else {
    // Add to end
    const [last] = await db
      .select()
      .from(items)
      .where(eq(items.mealId, input.targetMealId))
      .orderBy(desc(items.order))
      .limit(1);
    newOrder = (last?.order || 0) + 1;
  }

  // Move the item
  const oldData = { ...item };
  await db
    .update(items)
    .set({ mealId: input.targetMealId, order: newOrder })
    .where(eq(items.id, input.itemId));
  const [newData] = await db.select().from(items).where(eq(items.id, input.itemId)).limit(1);
  await logChange("update", "items", input.itemId, oldData, newData || undefined);

  // Reorder items in the old meal (compact orders)
  const oldMealItems = await db
    .select()
    .from(items)
    .where(eq(items.mealId, oldMealId))
    .orderBy(asc(items.order));
  for (let i = 0; i < oldMealItems.length; i++) {
    await db.update(items).set({ order: i }).where(eq(items.id, oldMealItems[i].id));
  }

  // Reorder items in the new meal (compact orders)
  const newMealItems = await db
    .select()
    .from(items)
    .where(eq(items.mealId, input.targetMealId))
    .orderBy(asc(items.order));
  for (let i = 0; i < newMealItems.length; i++) {
    await db.update(items).set({ order: i }).where(eq(items.id, newMealItems[i].id));
  }

  revalidatePath(`/noel/${input.slug}`);
}

const validateSchema = z.object({ key: z.string().optional() });
export async function validateWriteKeyAction(input: z.infer<typeof validateSchema>) {
  const writeKey = process.env.WRITE_KEY;
  if (!writeKey) return false;
  return input.key === writeKey;
}

export async function getChangeLogsAction() {
  const logs = await db
    .select()
    .from(changeLogs)
    .orderBy(desc(changeLogs.createdAt))
    .limit(100);
  return logs.map((log) => ({
    ...log,
    oldData: log.oldData ? JSON.parse(log.oldData) : null,
    newData: log.newData ? JSON.parse(log.newData) : null,
  }));
}
