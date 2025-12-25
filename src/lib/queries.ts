import { asc, eq } from "drizzle-orm";
import { db } from "./db";
import { meals, items, services, people, events, ingredients } from "@drizzle/schema";

export async function fetchPlan(slug: string) {
  // Trouver l'événement par slug
  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
  });

  if (!event) {
    return { event: null, meals: [], people: [] };
  }

  const mealList = await db.query.meals.findMany({
    where: eq(meals.eventId, event.id),
    orderBy: asc(meals.date),
    with: {
      services: {
        orderBy: asc(services.order),
        with: {
          items: {
            orderBy: asc(items.order),
            with: {
              person: true,
              ingredients: {
                orderBy: asc(ingredients.order),
              },
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
  return { event, meals: mealList, people: peopleList };
}

export async function fetchAllEvents() {
  return await db.query.events.findMany({
    orderBy: asc(events.createdAt),
  });
}
