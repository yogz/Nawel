"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { events } from "@drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { verifyEventAccess } from "./shared";
import { createEventSchema, deleteEventSchema } from "./schemas";
import { createMealWithServicesAction } from "./meal-actions";
import { withErrorThrower } from "@/lib/action-utils";

export const createEventAction = withErrorThrower(
  async (input: z.infer<typeof createEventSchema>) => {
    // Check for slug uniqueness
    const existing = await db.query.events.findFirst({
      where: eq(events.slug, input.slug),
    });

    if (existing) {
      throw new Error("Ce slug est déjà utilisé par un autre événement.");
    }

    // Get current session to set ownerId
    const { auth } = await import("@/lib/auth-config");
    const { headers } = await import("next/headers");
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Public action, uses provided key or generates new adminKey
    const adminKey = input.key && input.key.trim() !== "" ? input.key : randomUUID();
    const [created] = await db
      .insert(events)
      .values({
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        adminKey: adminKey,
        ownerId: session?.user.id ?? null,
      })
      .returning();
    await logChange("create", "events", created.id, null, created);

    if (input.creationMode && input.creationMode !== "zero") {
      const defaultDate = input.date || new Date().toISOString().split("T")[0];
      let services: string[] = [];

      switch (input.creationMode) {
        case "total":
          services = ["Aperitif", "Entree", "Plats", "Fromage", "Dessert", "Boissons", "Autre"];
          break;
        case "classique":
          services = ["Entree", "Plats", "Dessert"];
          break;
        case "apero":
          services = ["Aperitif", "Boissons"];
          break;
      }

      if (services.length > 0) {
        await createMealWithServicesAction({
          slug: created.slug,
          key: adminKey,
          date: defaultDate,
          title: "Repas complet",
          services: services,
        });
      }
    }

    revalidatePath("/");
    return created;
  }
);

export const getAllEventsAction = withErrorThrower(async () => {
  return await db.select().from(events).orderBy(desc(events.createdAt));
});

export const deleteEventAction = withErrorThrower(
  async (input: z.infer<typeof deleteEventSchema>) => {
    const event = await verifyEventAccess(input.slug, input.key);

    // Log deletion before removing the record
    await logChange("delete", "events", event.id, event);

    await db.delete(events).where(eq(events.id, event.id));

    revalidatePath("/");
    return { success: true };
  }
);
