"use server";

import { revalidatePath } from "next/cache";
import { type z } from "zod";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { events } from "@drizzle/schema";
import { eq, desc, or, exists, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { verifyEventAccess } from "./shared";
import { createEventSchema, deleteEventSchema } from "./schemas";
import { createMealWithServicesAction } from "./meal-actions";
import { createSafeAction, withErrorThrower } from "@/lib/action-utils";

export const createEventAction = createSafeAction(createEventSchema, async (input) => {
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
      adults: input.adults ?? 0,
      children: input.children ?? 0,
    })
    .returning();
  await logChange("create", "events", created.id, null, created);

  // Automatically add owner as a guest if they are logged in
  if (session?.user) {
    const [person] = await db
      .insert(require("@drizzle/schema").people)
      .values({
        eventId: created.id,
        name: session.user.name,
        emoji: "👑", // Set a crown for the creator
        userId: session.user.id,
      })
      .returning();
    await logChange("create", "people", person.id, null, person);
  }

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
        adults: created.adults,
        children: created.children,
      });
    }
  }

  revalidatePath("/");
  return created;
});

export const getAllEventsAction = withErrorThrower(async () => {
  return await db.select().from(events).orderBy(desc(events.createdAt));
});

export const getMyEventsAction = withErrorThrower(async () => {
  const { auth } = await import("@/lib/auth-config");
  const { headers } = await import("next/headers");
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return [];
  }

  // Use db.query to get relations easily
  return await db.query.events.findMany({
    where: or(
      eq(events.ownerId, session.user.id),
      exists(
        db
          .select()
          .from(require("@drizzle/schema").people)
          .where(
            and(
              eq(require("@drizzle/schema").people.eventId, events.id),
              eq(require("@drizzle/schema").people.userId, session.user.id)
            )
          )
      )
    ),
    with: {
      meals: true,
    },
    orderBy: desc(events.createdAt),
  });
});

export const deleteEventAction = createSafeAction(deleteEventSchema, async (input) => {
  const event = await verifyEventAccess(input.slug, input.key);

  // Log deletion before removing the record
  await logChange("delete", "events", event.id, event);

  await db.delete(events).where(eq(events.id, event.id));

  revalidatePath("/");
  return { success: true };
});
