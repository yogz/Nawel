"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { sanitizeStrictText, sanitizeSlug } from "@/lib/sanitize";
import { events, people, meals } from "@drizzle/schema";
import { eq, desc, or, exists, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { verifyEventAccess } from "./shared";
import {
  createEventSchema,
  deleteEventSchema,
  updateEventSchema,
  updateEventWithMealSchema,
} from "./schemas";
import { createMealWithServicesAction } from "./meal-actions";
import { createSafeAction, withErrorThrower } from "@/lib/action-utils";

export const createEventAction = createSafeAction(createEventSchema, async (input) => {
  // Find a unique slug automatically based on name
  let slug = sanitizeSlug(input.name, 50);
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
      const maxBaseLength = 50 - suffix.length;
      slug = sanitizeSlug(baseSlug.slice(0, maxBaseLength) + suffix, 50);
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

  // Always auto-generate adminKey for privacy/security
  const adminKey = randomUUID();
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
    const user = session.user as {
      id: string;
      name?: string | null;
      image?: string | null;
      emoji?: string | null;
    };
    const [person] = await db
      .insert(people)
      .values({
        eventId: created.id,
        name: sanitizeStrictText(user.name ?? "Utilisateur", 50),
        emoji: user.emoji ?? null,
        image: user.image ?? null,
        userId: user.id,
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
        time: input.time,
        address: input.address,
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
  const allEvents = await db.query.events.findMany({
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

  // Deduplicate events by ID (in case user is both owner and participant)
  const uniqueEventsMap = new Map<number, (typeof allEvents)[0]>();
  for (const event of allEvents) {
    if (!uniqueEventsMap.has(event.id)) {
      uniqueEventsMap.set(event.id, event);
    }
  }

  return Array.from(uniqueEventsMap.values());
});

export const updateEventAction = createSafeAction(updateEventSchema, async (input) => {
  const event = await verifyEventAccess(input.slug, input.key);

  await db
    .update(events)
    .set({
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.adults !== undefined && { adults: input.adults }),
      ...(input.children !== undefined && { children: input.children }),
    })
    .where(eq(events.id, event.id));

  await logChange("update", "events", event.id, event, {
    ...event,
    ...(input.name && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.adults !== undefined && { adults: input.adults }),
    ...(input.children !== undefined && { children: input.children }),
  });

  revalidatePath("/");
  revalidatePath(`/event/${event.slug}`);
  return { success: true };
});

export const deleteEventAction = createSafeAction(deleteEventSchema, async (input) => {
  const event = await verifyEventAccess(input.slug, input.key);

  // Log deletion before removing the record
  await logChange("delete", "events", event.id, event);

  await db.delete(events).where(eq(events.id, event.id));

  revalidatePath("/");
  return { success: true };
});

// Combined action to update event + associated meal in one operation
export const updateEventWithMealAction = createSafeAction(
  updateEventWithMealSchema,
  async (input) => {
    const event = await verifyEventAccess(input.slug, input.key);

    // 1. Update event fields
    await db
      .update(events)
      .set({
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.adults !== undefined && { adults: input.adults }),
        ...(input.children !== undefined && { children: input.children }),
      })
      .where(eq(events.id, event.id));

    await logChange("update", "events", event.id, event, {
      ...event,
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.adults !== undefined && { adults: input.adults }),
      ...(input.children !== undefined && { children: input.children }),
    });

    // 2. Update meal if mealId is provided
    if (input.mealId) {
      const currentMeal = await db.query.meals.findFirst({
        where: eq(meals.id, input.mealId),
      });

      if (currentMeal) {
        await db
          .update(meals)
          .set({
            ...(input.date && { date: input.date }),
            ...(input.time !== undefined && { time: input.time }),
            ...(input.address !== undefined && { address: input.address }),
          })
          .where(eq(meals.id, input.mealId));

        await logChange("update", "meals", input.mealId, currentMeal, {
          ...currentMeal,
          ...(input.date && { date: input.date }),
          ...(input.time !== undefined && { time: input.time }),
          ...(input.address !== undefined && { address: input.address }),
        });
      }
    }

    revalidatePath("/");
    revalidatePath(`/event/${event.slug}`);
    return { success: true };
  }
);
