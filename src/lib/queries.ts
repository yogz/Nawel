import { eq } from "drizzle-orm";
import { db } from "./db";
import { events } from "@drizzle/schema";
import { type PlanData, type Meal, type Person } from "./types";

/**
 * Fetches the complete event plan with all related data in optimized queries.
 *
 * Uses Drizzle's eager loading to fetch all data efficiently:
 * - Single query for event + people
 * - Single query for meals + services + items + ingredients
 *
 * This replaces the previous N+1 pattern that ran 1 query per meal.
 */
export async function fetchPlan(slug: string): Promise<PlanData> {
  // 1. Fetch event with people in a single query
  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    with: {
      people: {
        orderBy: (people, { asc }) => [asc(people.name)],
        with: { user: true },
      },
    },
  });

  if (!event) {
    return { event: null, meals: [], people: [] };
  }

  // 2. Fetch meals with all nested relations in a single query
  // This replaces the N+1 pattern (was: 1 query per meal)
  const mealRows = await db.query.meals.findMany({
    where: (meals, { eq }) => eq(meals.eventId, event.id),
    orderBy: (meals, { asc }) => [asc(meals.date)],
    with: {
      services: {
        orderBy: (services, { asc }) => [asc(services.order)],
        with: {
          items: {
            orderBy: (items, { asc }) => [asc(items.order)],
            with: {
              person: {
                with: { user: true },
              },
              ingredients: {
                orderBy: (ingredients, { asc }) => [asc(ingredients.order)],
              },
            },
          },
        },
      },
    },
  });

  // 3. Strip tokens from items' person references for security
  const mealsWithSecurePersons = mealRows.map((meal) => ({
    ...meal,
    services: meal.services.map((service) => ({
      ...service,
      items: service.items.map((item) => ({
        ...item,
        person: item.person ? { ...item.person, token: null } : null,
      })),
    })),
  }));

  // 4. Strip tokens from people for security
  // Tokens are sensitive - only the creator knows their token (stored in localStorage)
  const securePeople = event.people.map(({ token: _token, ...person }) => ({
    ...person,
    token: null, // Explicitly set to null instead of undefined for type consistency
  }));

  // Extract event without people (people are returned separately)
  const { people: _people, ...eventWithoutPeople } = event;

  return {
    event: eventWithoutPeople,
    meals: mealsWithSecurePersons as Meal[],
    people: securePeople as Person[],
  };
}
