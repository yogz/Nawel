import { asc } from "drizzle-orm";
import { db } from "./db";
import { days, items, meals, people } from "@/drizzle/schema";

export async function fetchPlan() {
  const dayList = await db.query.days.findMany({
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

  const peopleList = await db.query.people.findMany({ orderBy: asc(people.name) });
  return { days: dayList, people: peopleList };
}
