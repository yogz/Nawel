import { asc, eq } from "drizzle-orm";
import { db } from "./db";
import { meals, items, services, people, events, ingredients } from "@drizzle/schema";
import { type PlanData, type Meal, type Person } from "./types";

export async function fetchPlan(slug: string): Promise<PlanData> {
  // 1. Trouver l'événement
  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
  });

  if (!event) {
    return { event: null, meals: [], people: [] };
  }

  // 2. Récupérer les convives
  const peopleList = await db.query.people.findMany({
    where: eq(people.eventId, event.id),
    orderBy: asc(people.name),
    with: { user: true },
  });

  // 3. Récupérer les repas
  const mealRows = await db.query.meals.findMany({
    where: eq(meals.eventId, event.id),
    orderBy: asc(meals.date),
  });

  // 4. Pour chaque repas, récupérer ses services, articles et ingrédients avec les jointures manuelles pour éviter les requêtes trop complexes
  const mealsWithDetails = await Promise.all(
    mealRows.map(async (meal) => {
      const serviceRows = await db.query.services.findMany({
        where: eq(services.mealId, meal.id),
        orderBy: asc(services.order),
        with: {
          items: {
            orderBy: asc(items.order),
            with: {
              person: {
                with: { user: true },
              },
              ingredients: {
                orderBy: asc(ingredients.order),
              },
            },
          },
        },
      });

      return {
        ...meal,
        services: serviceRows,
      };
    })
  );

  return {
    event,
    meals: mealsWithDetails as Meal[],
    people: peopleList as Person[],
  };
}

export async function fetchAllEvents() {
  return await db.query.events.findMany({
    orderBy: asc(events.createdAt),
  });
}
