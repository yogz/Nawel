"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { items, ingredientCache } from "@drizzle/schema";
import { eq, asc, sql } from "drizzle-orm";
import { verifyAccess } from "./shared";
import {
  createItemSchema,
  updateItemSchema,
  deleteItemSchema,
  assignItemSchema,
  reorderSchema,
  moveItemSchema,
  toggleItemCheckedSchema,
  saveAIFeedbackSchema,
} from "./schemas";
import { createSafeAction } from "@/lib/action-utils";

export const createItemAction = createSafeAction(createItemSchema, async (input) => {
  await verifyAccess(input.slug, "item:create", input.key, input.token);

  // Atomique: évite les race conditions
  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number | null>`MAX(${items.order})` })
    .from(items)
    .where(eq(items.serviceId, input.serviceId));
  const order = (maxOrder ?? -1) + 1;

  const [created] = await db
    .insert(items)
    .values({
      serviceId: input.serviceId,
      name: input.name,
      quantity: input.quantity ?? null,
      note: input.note ?? null,
      price: input.price ?? null,
      personId: input.personId ?? null,
      order,
    })
    .returning();

  revalidatePath(`/event/${input.slug}`);
  return created;
});

export const updateItemAction = createSafeAction(updateItemSchema, async (input) => {
  await verifyAccess(input.slug, "item:update", input.key, input.token);

  const [updated] = await db
    .update(items)
    .set({
      name: input.name,
      quantity: input.quantity,
      note: input.note,
      price: input.price ?? null,
      personId: input.personId,
    })
    .where(eq(items.id, input.id))
    .returning();
  revalidatePath(`/event/${input.slug}`);
  return updated;
});

export const deleteItemAction = createSafeAction(deleteItemSchema, async (input) => {
  await verifyAccess(input.slug, "item:delete", input.key, input.token);
  const [deleted] = await db.delete(items).where(eq(items.id, input.id)).returning();
  revalidatePath(`/event/${input.slug}`);
  return { success: true };
});

export const assignItemAction = createSafeAction(assignItemSchema, async (input) => {
  await verifyAccess(input.slug, "item:assign", input.key, input.token);

  const [updated] = await db
    .update(items)
    .set({ personId: input.personId })
    .where(eq(items.id, input.id))
    .returning();

  revalidatePath(`/event/${input.slug}`);
  return updated;
});

export const reorderItemsAction = createSafeAction(reorderSchema, async (input) => {
  await verifyAccess(input.slug, "item:update", input.key, input.token);
  await db.transaction(async (tx) => {
    for (let i = 0; i < input.itemIds.length; i++) {
      await tx.update(items).set({ order: i }).where(eq(items.id, input.itemIds[i]));
    }
  });
  revalidatePath(`/event/${input.slug}`);
  return { success: true };
});

export const moveItemAction = createSafeAction(moveItemSchema, async (input) => {
  await verifyAccess(input.slug, "item:update", input.key, input.token);

  const itemId = input.itemId;
  const targetServiceId = input.targetServiceId;
  const targetOrder = input.targetOrder;

  await db.transaction(async (tx) => {
    // 1. Get the item to move
    const item = await tx.query.items.findFirst({
      where: eq(items.id, itemId),
    });
    if (!item) {
      throw new Error("Item not found");
    }

    const sourceServiceId = item.serviceId;

    if (sourceServiceId === targetServiceId) {
      if (targetOrder === undefined) {
        return;
      }
      // Reorder within same service
      const serviceItems = await tx.query.items.findMany({
        where: eq(items.serviceId, sourceServiceId),
        orderBy: [asc(items.order)],
      });
      const newItems = serviceItems.filter((i) => i.id !== itemId);
      newItems.splice(targetOrder, 0, item);
      for (let i = 0; i < newItems.length; i++) {
        await tx.update(items).set({ order: i }).where(eq(items.id, newItems[i].id));
      }
    } else {
      // 2. Remove from source service and shift others
      await tx
        .update(items)
        .set({ order: sql`${items.order} - 1` })
        .where(sql`${items.serviceId} = ${sourceServiceId} AND ${items.order} > ${item.order}`);

      // 3. Prepare space in target service
      const serviceItems = await tx.query.items.findMany({
        where: eq(items.serviceId, targetServiceId),
        orderBy: [asc(items.order)],
      });

      const finalOrder = targetOrder !== undefined ? targetOrder : serviceItems.length;

      await tx
        .update(items)
        .set({ order: sql`${items.order} + 1` })
        .where(sql`${items.serviceId} = ${targetServiceId} AND ${items.order} >= ${finalOrder}`);

      // 4. Update the item itself
      await tx
        .update(items)
        .set({
          serviceId: targetServiceId,
          order: finalOrder,
        })
        .where(eq(items.id, itemId));
    }
  });

  revalidatePath(`/event/${input.slug}`);
  return { success: true };
});

export const toggleItemCheckedAction = createSafeAction(toggleItemCheckedSchema, async (input) => {
  await verifyAccess(input.slug, "item:check", input.key, input.token);
  const [updated] = await db
    .update(items)
    .set({ checked: input.checked })
    .where(eq(items.id, input.id))
    .returning();
  revalidatePath(`/event/${input.slug}`);
  return updated;
});
export const saveAIFeedbackAction = createSafeAction(saveAIFeedbackSchema, async (input) => {
  await verifyAccess(input.slug, "item:update", input.key, input.token);

  const [updated] = await db
    .update(items)
    .set({ aiRating: input.rating })
    .where(eq(items.id, input.itemId))
    .returning();

  // Also update global cache if linked
  if (updated?.cacheId) {
    await db
      .update(ingredientCache)
      .set({
        ratingSum: sql`${ingredientCache.ratingSum} + ${input.rating}`,
        ratingCount: sql`${ingredientCache.ratingCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(ingredientCache.id, updated.cacheId));
  }

  revalidatePath(`/event/${input.slug}`);
  revalidatePath(`/admin/cache`);
  return updated;
});
