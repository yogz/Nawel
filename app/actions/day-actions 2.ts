"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { days } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyEventAccess } from "./shared";
import { createDaySchema, updateDaySchema, baseInput } from "./schemas";

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
    await logChange("delete", "days", deleted.id, deleted, null);
    revalidatePath(`/event/${input.slug}`);
    return { success: true };
}
