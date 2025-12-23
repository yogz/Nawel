"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { events } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { baseInput, verifyEventAccess } from "./shared";

const createEventSchema = z.object({
    slug: z.string().min(1).max(100),
    name: z.string().min(1),
    description: z.string().optional(),
    key: z.string().optional(),
});

export async function createEventAction(input: z.infer<typeof createEventSchema>) {
    // Check for slug uniqueness
    const existing = await db.query.events.findFirst({
        where: eq(events.slug, input.slug),
    });

    if (existing) {
        throw new Error("Ce slug est déjà utilisé par un autre événement.");
    }

    // Public action, generates new adminKey
    const adminKey = randomUUID();
    const [created] = await db
        .insert(events)
        .values({
            slug: input.slug,
            name: input.name,
            description: input.description ?? null,
            adminKey: adminKey,
        })
        .returning();
    await logChange("create", "events", created.id, null, created);
    revalidatePath("/");
    return created;
}

export async function getAllEventsAction() {
    return await db
        .select()
        .from(events)
        .orderBy(desc(events.createdAt));
}

const deleteEventSchema = baseInput;
export async function deleteEventAction(input: z.infer<typeof deleteEventSchema>) {
    const event = await verifyEventAccess(input.slug, input.key);

    // Log deletion before removing the record
    await logChange("delete", "events", event.id, event);

    await db.delete(events).where(eq(events.id, event.id));

    revalidatePath("/");
    return { success: true };
}
