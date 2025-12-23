"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { people } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { baseInput, verifyEventAccess } from "./shared";

const createPersonSchema = baseInput.extend({ name: z.string().min(1), emoji: z.string().optional() });
export async function createPersonAction(input: z.infer<typeof createPersonSchema>) {
    try {
        const event = await verifyEventAccess(input.slug, input.key);
        const [created] = await db.insert(people).values({
            eventId: event.id,
            name: input.name,
            emoji: input.emoji ?? null,
        }).returning();

        await logChange("create", "people", created.id, null, created);
        revalidatePath(`/event/${input.slug}`);
        return created;
    } catch (error) {
        console.error("Error in createPersonAction:", error);
        throw error instanceof Error ? error : new Error("An unknown error occurred while adding the person");
    }
}

const updatePersonSchema = baseInput.extend({
    id: z.number(),
    name: z.string().min(1),
    emoji: z.string().optional().nullable(),
});

export async function updatePersonAction(input: z.infer<typeof updatePersonSchema>) {
    await verifyEventAccess(input.slug, input.key);
    const [oldData] = await db.select().from(people).where(eq(people.id, input.id)).limit(1);
    await db
        .update(people)
        .set({
            name: input.name,
            emoji: input.emoji ?? null,
        })
        .where(eq(people.id, input.id));
    const [newData] = await db.select().from(people).where(eq(people.id, input.id)).limit(1);
    await logChange("update", "people", input.id, oldData || undefined, newData || undefined);
    revalidatePath(`/event/${input.slug}`);
}

const deletePersonSchema = baseInput.extend({ id: z.number() });
export async function deletePersonAction(input: z.infer<typeof deletePersonSchema>) {
    await verifyEventAccess(input.slug, input.key);
    const [oldData] = await db.select().from(people).where(eq(people.id, input.id)).limit(1);
    await db.delete(people).where(eq(people.id, input.id));
    await logChange("delete", "people", input.id, oldData || undefined);
    revalidatePath(`/event/${input.slug}`);
}
