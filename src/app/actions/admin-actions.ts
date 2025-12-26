"use server";

import { db } from "@/lib/db";
import { events, meals, services, people, items } from "@drizzle/schema";
import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Non authentifié");
  }

  if (session.user.role !== "admin") {
    throw new Error("Accès refusé - Rôle admin requis");
  }

  return session;
}

export type EventWithStats = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  adminKey: string | null;
  createdAt: Date;
  mealsCount: number;
  servicesCount: number;
  peopleCount: number;
  itemsCount: number;
};

export async function getAllEventsAction(): Promise<EventWithStats[]> {
  await requireAdmin();

  const allEvents = await db.query.events.findMany({
    orderBy: (events, { desc }) => [desc(events.createdAt)],
  });

  const eventsWithStats: EventWithStats[] = await Promise.all(
    allEvents.map(async (event) => {
      const [mealsResult] = await db
        .select({ count: count() })
        .from(meals)
        .where(eq(meals.eventId, event.id));

      const [peopleResult] = await db
        .select({ count: count() })
        .from(people)
        .where(eq(people.eventId, event.id));

      const servicesResult = await db
        .select({ count: count() })
        .from(services)
        .innerJoin(meals, eq(services.mealId, meals.id))
        .where(eq(meals.eventId, event.id));

      const itemsResult = await db
        .select({ count: count() })
        .from(items)
        .innerJoin(services, eq(items.serviceId, services.id))
        .innerJoin(meals, eq(services.mealId, meals.id))
        .where(eq(meals.eventId, event.id));

      return {
        id: event.id,
        slug: event.slug,
        name: event.name,
        description: event.description,
        adminKey: event.adminKey,
        createdAt: event.createdAt,
        mealsCount: mealsResult?.count ?? 0,
        servicesCount: servicesResult[0]?.count ?? 0,
        peopleCount: peopleResult?.count ?? 0,
        itemsCount: itemsResult[0]?.count ?? 0,
      };
    })
  );

  return eventsWithStats;
}

export async function updateEventAdminAction(input: {
  id: number;
  name: string;
  description: string | null;
}): Promise<void> {
  await requireAdmin();

  await db
    .update(events)
    .set({
      name: input.name,
      description: input.description,
    })
    .where(eq(events.id, input.id));

  revalidatePath("/admin");
}

export async function deleteEventAdminAction(id: number): Promise<void> {
  await requireAdmin();

  await db.delete(events).where(eq(events.id, id));

  revalidatePath("/admin");
}
