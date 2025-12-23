"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { items } from "@/drizzle/schema";
import { eq, asc, sql } from "drizzle-orm";
import { verifyEventAccess } from "./shared";
import {
    createItemSchema,
    updateItemSchema,
    deleteItemSchema,
    assignItemSchema,
    reorderSchema,
    moveItemSchema,
} from "./schemas";

export async function createItemAction(input: z.infer<typeof createItemSchema>) {
    await verifyEventAccess(input.slug, input.key);

    const lastItem = await db.query.items.findFirst({
        where: eq(items.mealId, input.mealId),
        orderBy: [asc(items.order)],
    });
    const order = lastItem ? lastItem.order + 1 : 0;

    const [created] = await db
        .insert(items)
        .values({
            mealId: input.mealId,
            name: input.name,
            quantity: input.quantity ?? null,
            note: input.note ?? null,
            price: input.price ?? null,
            order,
        })
        .returning();

    await logChange("create", "items", created.id, null, created);
    revalidatePath(`/event/${input.slug}`);
    return created;
}

export async function updateItemAction(input: z.infer<typeof updateItemSchema>) {
    await verifyEventAccess(input.slug, input.key);
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
    await logChange("update", "items", updated.id, null, updated);
    revalidatePath(`/event/${input.slug}`);
    return updated;
}

export async function deleteItemAction(input: z.infer<typeof deleteItemSchema>) {
    await verifyEventAccess(input.slug, input.key);
    const [deleted] = await db.delete(items).where(eq(items.id, input.id)).returning();
    if (deleted) {
        await logChange("delete", "items", deleted.id, deleted, null);
    }
    revalidatePath(`/event/${input.slug}`);
    return { success: true };
}

export async function assignItemAction(input: z.infer<typeof assignItemSchema>) {
    await verifyEventAccess(input.slug, input.key);
    const [updated] = await db
        .update(items)
        .set({ personId: input.personId })
        .where(eq(items.id, input.id))
        .returning();
    await logChange("update", "items", updated.id, null, updated);
    revalidatePath(`/event/${input.slug}`);
    return updated;
}

export async function reorderItemsAction(input: z.infer<typeof reorderSchema>) {
    await verifyEventAccess(input.slug, input.key);
    await db.transaction(async (tx) => {
        for (let i = 0; i < input.itemIds.length; i++) {
            await tx.update(items).set({ order: i }).where(eq(items.id, input.itemIds[i]));
        }
    });
    revalidatePath(`/event/${input.slug}`);
    return { success: true };
}

export async function moveItemAction(input: z.infer<typeof moveItemSchema>) {
    await verifyEventAccess(input.slug, input.key);

    const itemId = input.itemId;
    const targetMealId = input.targetMealId;
    const targetOrder = input.targetOrder;

    await db.transaction(async (tx) => {
        // 1. Get the item to move
        const item = await tx.query.items.findFirst({
            where: eq(items.id, itemId),
        });
        if (!item) throw new Error("Item not found");

        const sourceMealId = item.mealId;

        if (sourceMealId === targetMealId) {
            if (targetOrder === undefined) return;
            // Reorder within same meal
            const mealItems = await tx.query.items.findMany({
                where: eq(items.mealId, sourceMealId),
                orderBy: [asc(items.order)],
            });
            const newItems = mealItems.filter((i) => i.id !== itemId);
            newItems.splice(targetOrder, 0, item);
            for (let i = 0; i < newItems.length; i++) {
                await tx.update(items).set({ order: i }).where(eq(items.id, newItems[i].id));
            }
        } else {
            // 2. Remove from source meal and shift others
            await tx
                .update(items)
                .set({ order: sql`${items.order} - 1` })
                .where(sql`${items.mealId} = ${sourceMealId} AND ${items.order} > ${item.order}`);

            // 3. Prepare space in target meal
            const mealItems = await tx.query.items.findMany({
                where: eq(items.mealId, targetMealId),
                orderBy: [asc(items.order)],
            });

            const finalOrder = targetOrder !== undefined ? targetOrder : mealItems.length;

            await tx
                .update(items)
                .set({ order: sql`${items.order} + 1` })
                .where(sql`${items.mealId} = ${targetMealId} AND ${items.order} >= ${finalOrder}`);

            // 4. Update the item itself
            await tx
                .update(items)
                .set({
                    mealId: targetMealId,
                    order: finalOrder,
                })
                .where(eq(items.id, itemId));
        }
    });

    revalidatePath(`/event/${input.slug}`);
    return { success: true };
}
