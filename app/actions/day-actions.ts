"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { days } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { meals } from "@/drizzle/schema";
import { verifyEventAccess } from "./shared";
import { createDaySchema, updateDaySchema, createDayWithMealsSchema, baseInput } from "./schemas";

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

export async function createDayWithMealsAction(input: z.infer<typeof createDayWithMealsSchema>) {
    const event = await verifyEventAccess(input.slug, input.key);

    const result = await db.transaction(async (tx) => {
        const [day] = await tx
            .insert(days)
            .values({ eventId: event.id, date: input.date, title: input.title ?? null })
            .returning();

        await logChange("create", "days", day.id, null, day);

        const createdMeals = [];
        for (let i = 0; i < input.meals.length; i++) {
            const [meal] = await tx
                .insert(meals)
                .values({ dayId: day.id, title: input.meals[i], order: i })
                .returning();
            await logChange("create", "meals", meal.id, null, meal);
            createdMeals.push({ ...meal, items: [] });
        }

        return { ...day, meals: createdMeals };
    });

    revalidatePath(`/event/${input.slug}`);
    return result;
}

export async function updateDayAction(input: z.infer<typeof updateDaySchema>) {
    await verifyEventAccess(input.slug, input.key);
    const [updated] = await db
        .update(days)
        .set({ date: input.date, title: input.title })
        .where(eq(days.id, input.id))
        .returning();
    await logChange("update", "days", updated.id, null, updated);
    revalidatePath(`/event/${input.slug}`);
    return updated;
}

export async function deleteDayAction(input: z.infer<typeof baseInput> & { id: number }) {
    await verifyEventAccess(input.slug, input.key);
    const [deleted] = await db.delete(days).where(eq(days.id, input.id)).returning();
    if (deleted) {
        await logChange("delete", "days", deleted.id, deleted, null);
    }
    revalidatePath(`/event/${input.slug}`);
    return { success: true };
}
