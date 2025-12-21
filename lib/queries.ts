import { asc, eq } from "drizzle-orm";
import { db } from "./db";
import { days, items, meals, people, events } from "@/drizzle/schema";

export async function fetchPlan(slug: string) {
  // Trouver l'événement par slug
  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
  });

  if (!event) {
    return { days: [], people: [] };
  }

  const dayList = await db.query.days.findMany({
    where: eq(days.eventId, event.id),
    orderBy: asc(days.date),
    with: {
      meals: {
        orderBy: asc(meals.order),
        with: {
          items: {
            orderBy: asc(items.order),
            with: {
              person: true,
            },
          },
        },
      },
    },
  });

  const peopleList = await db.query.people.findMany({
    where: eq(people.eventId, event.id),
    orderBy: asc(people.name),
  });
  return { days: dayList, people: peopleList };
}

export async function fetchAllEvents() {
  return await db.query.events.findMany({
    orderBy: asc(events.createdAt),
  });
}
