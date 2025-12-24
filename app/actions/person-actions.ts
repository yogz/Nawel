"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { people, items } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyEventAccess } from "./shared";
import { createPersonSchema, updatePersonSchema, deletePersonSchema } from "./schemas";
import { withErrorThrower } from "@/lib/action-utils";

export const createPersonAction = withErrorThrower(async (input: z.infer<typeof createPersonSchema>) => {
    const event = await verifyEventAccess(input.slug, input.key);
    const [created] = await db
        .insert(people)
        .values({
            eventId: event.id,
            name: input.name,
            emoji: input.emoji ?? null,
        })
        .returning();
    await logChange("create", "people", created.id, null, created);
    revalidatePath(`/event/${input.slug}`);
    return created;
});

export const updatePersonAction = withErrorThrower(async (input: z.infer<typeof updatePersonSchema>) => {
    await verifyEventAccess(input.slug, input.key);
    const [updated] = await db
        .update(people)
        .set({ name: input.name, emoji: input.emoji })
        .where(eq(people.id, input.id))
        .returning();
    await logChange("update", "people", updated.id, null, updated);
    revalidatePath(`/event/${input.slug}`);
    return updated;
});

export const deletePersonAction = withErrorThrower(async (input: z.infer<typeof deletePersonSchema>) => {
    await verifyEventAccess(input.slug, input.key);

    // Unassign items first
    await db.update(items).set({ personId: null }).where(eq(items.personId, input.id));

    const [deleted] = await db.delete(people).where(eq(people.id, input.id)).returning();
    if (deleted) {
        await logChange("delete", "people", deleted.id, deleted, null);
    }
    revalidatePath(`/event/${input.slug}`);
    return { success: true };
});

