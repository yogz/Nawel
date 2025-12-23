"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { items } from "@/drizzle/schema";
import { eq, asc, desc } from "drizzle-orm";
import { baseInput, verifyEventAccess } from "./shared";

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
