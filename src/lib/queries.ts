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

      // Strip tokens from items' person references for security
      const secureServiceRows = serviceRows.map((service) => ({
        ...service,
        items: service.items.map((item) => ({
          ...item,
          person: item.person ? { ...item.person, token: null } : null,
        })),
      }));

      return {
        ...meal,
        services: secureServiceRows,
      };
    })
  );

  // 5. Strip tokens from people for security
  // Tokens are sensitive - only the creator knows their token (stored in localStorage)
  const securePeople = peopleList.map(({ token: _token, ...person }) => ({
    ...person,
    token: null, // Explicitly set to null instead of undefined for type consistency
  }));

  return {
    event,
    meals: mealsWithDetails as Meal[],
    people: securePeople as Person[],
  };
}
