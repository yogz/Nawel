"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { sanitizeStrictText, sanitizeSlug } from "@/lib/sanitize";
import { events, people } from "@drizzle/schema";
import { eq, desc, or, exists, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { verifyEventAccess } from "./shared";
import { createEventSchema, deleteEventSchema } from "./schemas";
import { createMealWithServicesAction } from "./meal-actions";
import { createSafeAction, withErrorThrower } from "@/lib/action-utils";

export const createEventAction = createSafeAction(createEventSchema, async (input) => {
  // Find a unique slug automatically
  let slug = input.slug;
  const baseSlug = slug;
  let isUnique = false;
  let counter = 1;

  while (!isUnique) {
    const existing = await db.query.events.findFirst({
      where: eq(events.slug, slug),
    });

    if (existing) {
      // Append number to base slug (limit base length to accommodate suffix within DB limits)
      const suffix = `-${counter}`;
      const maxBaseLength = 100 - suffix.length;
      slug = sanitizeSlug(baseSlug.slice(0, maxBaseLength) + suffix, 100);
      counter++;
    } else {
      isUnique = true;
    }
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
      slug: slug,
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
      .insert(people)
      .values({
        eventId: created.id,
        name: sanitizeStrictText(session.user.name ?? "Utilisateur", 50),
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
          .from(people)
          .where(and(eq(people.eventId, events.id), eq(people.userId, session.user.id)))
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
