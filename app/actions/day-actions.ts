"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { days } from "@/drizzle/schema";
import { baseInput, verifyEventAccess } from "./shared";

const createDaySchema = baseInput.extend({
    date: z.string().min(1, "Date required"),
    title: z.string().optional(),
});

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
