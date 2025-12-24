"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { events } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { verifyEventAccess } from "./shared";
import { createEventSchema, deleteEventSchema } from "./schemas";
import { createDayWithMealsAction } from "./day-actions";
import { withErrorThrower } from "@/lib/action-utils";

export const createEventAction = withErrorThrower(async (input: z.infer<typeof createEventSchema>) => {
    // Check for slug uniqueness
    const existing = await db.query.events.findFirst({
        where: eq(events.slug, input.slug),
    });

    if (existing) {
        throw new Error("Ce slug est déjà utilisé par un autre événement.");
    }

    // Public action, uses provided key or generates new adminKey
    const adminKey = input.key && input.key.trim() !== "" ? input.key : randomUUID();
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

    if (input.creationMode && input.creationMode !== "zero") {
        const defaultDate = input.date || new Date().toISOString().split('T')[0];
        let meals: string[] = [];

        switch (input.creationMode) {
            case "total":
                meals = ["Aperitif", "Entree", "Plats", "Fromage", "Dessert", "Boissons", "Autre"];
                break;
            case "classique":
                meals = ["Entree", "Plats", "Dessert"];
                break;
            case "apero":
                meals = ["Aperitif", "Boissons"];
                break;
        }

        if (meals.length > 0) {
            await createDayWithMealsAction({
                slug: created.slug,
                key: adminKey,
                date: defaultDate,
                title: "Repas complet",
                meals: meals,
            });
        }
    }

    revalidatePath("/");
    return created;
});

export const getAllEventsAction = withErrorThrower(async () => {
    return await db
        .select()
        .from(events)
        .orderBy(desc(events.createdAt));
});

export const deleteEventAction = withErrorThrower(async (input: z.infer<typeof deleteEventSchema>) => {
    const event = await verifyEventAccess(input.slug, input.key);

    // Log deletion before removing the record
    await logChange("delete", "events", event.id, event);

    await db.delete(events).where(eq(events.id, event.id));

    revalidatePath("/");
    return { success: true };
});

