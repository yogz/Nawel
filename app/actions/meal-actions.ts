"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { meals } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyEventAccess } from "./shared";
import { createMealSchema, mealSchema, deleteMealSchema } from "./schemas";
import { withErrorThrower } from "@/lib/action-utils";

export const createMealAction = withErrorThrower(async (input: z.infer<typeof createMealSchema>) => {
    await verifyEventAccess(input.slug, input.key);
    const [created] = await db
        .insert(meals)
        .values({ dayId: input.dayId, title: input.title })
        .returning();
    await logChange("create", "meals", created.id, null, created);
    revalidatePath(`/event/${input.slug}`);
    return created;
});

export const updateMealTitleAction = withErrorThrower(async (input: z.infer<typeof mealSchema>) => {
    await verifyEventAccess(input.slug, input.key);
    const [updated] = await db
        .update(meals)
        .set({ title: input.title })
        .where(eq(meals.id, input.id))
        .returning();
    await logChange("update", "meals", updated.id, null, updated);
    revalidatePath(`/event/${input.slug}`);
    return updated;
});

export const deleteMealAction = withErrorThrower(async (input: z.infer<typeof deleteMealSchema>) => {
    await verifyEventAccess(input.slug, input.key);
    const [deleted] = await db.delete(meals).where(eq(meals.id, input.id)).returning();
    if (deleted) {
        await logChange("delete", "meals", deleted.id, deleted, null);
    }
    revalidatePath(`/event/${input.slug}`);
    return { success: true };
});

