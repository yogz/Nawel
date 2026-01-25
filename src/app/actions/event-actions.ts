"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sanitizeStrictText, sanitizeSlug } from "@/lib/sanitize";
import { events, people, meals } from "@drizzle/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { verifyAccess } from "./shared";
import {
  createEventSchema,
  deleteEventSchema,
  updateEventSchema,
  updateEventWithMealSchema,
} from "./schemas";
import { createMealWithServicesAction } from "./meal-actions";
import { createSafeAction, withErrorThrower } from "@/lib/action-utils";
import { getTranslations } from "next-intl/server";

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

  // Automatically add owner as a guest if they are logged in
  let guestToken: string | undefined;
  let guestPersonId: number | undefined;

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
        name: sanitizeStrictText(user.name ?? "User", 50),
        emoji: user.emoji ?? null,
        image: user.image ?? null,
        userId: user.id,
        status: "confirmed",
      })
      .returning();
  } else {
    // If guest mode (no account), create a default "Host" profile with a token
    // allowing them to have immediate write access via local storage
    const token = randomUUID();
    const [person] = await db
      .insert(people)
      .values({
        eventId: created.id,
        name: "Hôte", // Default name for the creator
        token: token,
        status: "confirmed",
      })
      .returning();

    guestToken = token;
    guestPersonId = person.id;
  }

  if (input.creationMode === "vacation") {
    const startDate = input.date || new Date().toISOString().split("T")[0];
    const duration = input.duration ?? 7;
    const mealTitles = input.mealTitles || {
      common: "Communs",
      lunch: "Déjeuner",
      dinner: "Dîner",
    };

    // 1. Create Common meal
    await createMealWithServicesAction({
      slug: created.slug,
      key: adminKey,
      token: guestToken,
      date: "common",
      title: mealTitles.common,
      services: ["divers"],
      adults: created.adults,
      children: created.children,
    });

    // 2. Create meals for each day
    const start = new Date(startDate);
    for (let i = 0; i < duration; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];

      // Get localized day name for the title
      const dayName = currentDate.toLocaleDateString(input.locale || "fr", { weekday: "long" });
      const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

      await createMealWithServicesAction({
        slug: created.slug,
        key: adminKey,
        token: guestToken,
        date: dateStr,
        time: "12:30",
        address: input.address,
        title: capitalizedDayName,
        services: ["midi", "soir"],
        adults: created.adults,
        children: created.children,
      });
    }
  } else if (input.creationMode || !input.creationMode) {
    const defaultMode = input.creationMode || "total";
    const defaultDate = input.date || new Date().toISOString().split("T")[0];
    let services: { title: string; description: string | null }[] = [];

    switch (defaultMode) {
      case "total":
        services = [
          {
            title: "course_starter",
            description: "desc_starter",
          },
          {
            title: "course_main",
            description: "desc_main",
          },
          {
            title: "course_sweet",
            description: "desc_sweet",
          },
          {
            title: "course_drinks",
            description: "desc_drinks",
          },
          {
            title: "course_cheese_extras",
            description: "desc_cheese_extras",
          },
        ];
        break;
      case "classique":
        services = [
          { title: "entree", description: null },
          { title: "plat", description: null },
          { title: "dessert", description: null },
        ];
        break;
      case "apero":
        services = [
          { title: "apero", description: null },
          { title: "boissons", description: null },
        ];
        break;
    }

    if (services.length > 0) {
      await createMealWithServicesAction({
        slug: created.slug,
        key: adminKey,
        token: guestToken,
        date: defaultDate,
        time: input.time,
        address: input.address,
        title: defaultMode === "total" ? "Menu" : "Full meal",
        services: services,
        adults: created.adults,
        children: created.children,
      });
    }
  }

  revalidatePath("/");
  return { ...created, guestToken, guestPersonId };
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

  // Get event IDs where user is owner
  const ownedEventIds = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.ownerId, session.user.id));

  // Get event IDs where user is participant
  const participantEventIds = await db
    .selectDistinct({ id: events.id })
    .from(events)
    .innerJoin(people, eq(people.eventId, events.id))
    .where(eq(people.userId, session.user.id));

  // Combine and deduplicate IDs
  const allEventIds = new Set<number>();
  ownedEventIds.forEach((row) => allEventIds.add(row.id));
  participantEventIds.forEach((row) => allEventIds.add(row.id));

  const uniqueEventIds = Array.from(allEventIds);

  if (uniqueEventIds.length === 0) {
    return [];
  }

  // Fetch the full events with relations using the unique IDs
  const uniqueEvents = await db.query.events.findMany({
    where: inArray(events.id, uniqueEventIds),
    with: {
      meals: true,
    },
    orderBy: desc(events.createdAt),
  });

  return uniqueEvents;
});

export const updateEventAction = createSafeAction(updateEventSchema, async (input) => {
  const { event } = await verifyAccess(input.slug, "event:update", input.key, input.token);

  await db
    .update(events)
    .set({
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.adults !== undefined && { adults: input.adults }),
      ...(input.children !== undefined && { children: input.children }),
    })
    .where(eq(events.id, event.id));

  revalidatePath("/");
  revalidatePath(`/event/${event.slug}`);
  return { success: true };
});

export const deleteEventAction = createSafeAction(deleteEventSchema, async (input) => {
  const { event } = await verifyAccess(input.slug, "event:delete", input.key, input.token);

  await db.delete(events).where(eq(events.id, event.id));

  revalidatePath("/");
  return { success: true };
});

// Combined action to update event + associated meal in one operation
export const updateEventWithMealAction = createSafeAction(
  updateEventWithMealSchema,
  async (input) => {
    const { event } = await verifyAccess(input.slug, "event:update", input.key, input.token);

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
      }
    }

    revalidatePath("/");
    revalidatePath(`/event/${event.slug}`);
    return { success: true };
  }
);
