"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { services } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyEventAccess } from "./shared";
import { createServiceSchema, serviceSchema, deleteServiceSchema } from "./schemas";
import { withErrorThrower } from "@/lib/action-utils";

export const createServiceAction = withErrorThrower(async (input: z.infer<typeof createServiceSchema>) => {
    await verifyEventAccess(input.slug, input.key);
    const [created] = await db
        .insert(services)
        .values({
            mealId: input.mealId,
            title: input.title,
            peopleCount: input.peopleCount ?? 1
        })
        .returning();
    await logChange("create", "services", created.id, null, created);
    revalidatePath(`/event/${input.slug}`);
    return created;
});

export const updateServiceAction = withErrorThrower(async (input: z.infer<typeof serviceSchema>) => {
    await verifyEventAccess(input.slug, input.key);
    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.peopleCount !== undefined) updateData.peopleCount = input.peopleCount;

    const [updated] = await db
        .update(services)
        .set(updateData)
        .where(eq(services.id, input.id))
        .returning();
    await logChange("update", "services", updated.id, null, updated);
    revalidatePath(`/event/${input.slug}`);
    return updated;
});

export const deleteServiceAction = withErrorThrower(async (input: z.infer<typeof deleteServiceSchema>) => {
    await verifyEventAccess(input.slug, input.key);
    const [deleted] = await db.delete(services).where(eq(services.id, input.id)).returning();
    if (deleted) {
        await logChange("delete", "services", deleted.id, deleted, null);
    }
    revalidatePath(`/event/${input.slug}`);
    return { success: true };
});
