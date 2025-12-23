"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { meals } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { baseInput, verifyEventAccess } from "./shared";

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
