import { db } from "../lib/db";
import { days, items, meals, people } from "../drizzle/schema";

async function run() {
  const [existingDay] = await db.select().from(days).limit(1);
  if (existingDay) {
    console.log("Seed skipped: data already present");
    return;
  }

  const [eve] = await db
    .insert(days)
    .values({ date: "2024-12-24", title: "Christmas Eve" })
    .returning();
  const [day] = await db
    .insert(days)
    .values({ date: "2024-12-25", title: "Christmas Day" })
    .returning();

  const peopleRows = await db
    .insert(people)
    .values([
      { name: "Alice" },
      { name: "Bastien" },
      { name: "Chloé" },
    ])
    .returning();

  const [aperitifEve, dinnerEve] = await db
    .insert(meals)
    .values([
      { dayId: eve.id, title: "Apéritif", order: 0 },
      { dayId: eve.id, title: "Dinner", order: 1 },
    ])
    .returning();

  const [brunchDay, dessertDay] = await db
    .insert(meals)
    .values([
      { dayId: day.id, title: "Brunch", order: 0 },
      { dayId: day.id, title: "Desserts", order: 1 },
    ])
    .returning();

  await db.insert(items).values([
    { mealId: aperitifEve.id, name: "Cheese board", quantity: "1 large", personId: peopleRows[0].id, order: 0 },
    { mealId: aperitifEve.id, name: "Mulled wine", note: "non-alcoholic too", personId: peopleRows[1].id, order: 1 },
    { mealId: dinnerEve.id, name: "Turkey", quantity: "4kg", personId: peopleRows[1].id, order: 0 },
    { mealId: dinnerEve.id, name: "Mashed potatoes", quantity: "2 trays", order: 1 },
    { mealId: brunchDay.id, name: "Croissants", quantity: "12", personId: peopleRows[2].id, order: 0 },
    { mealId: dessertDay.id, name: "Bûche", note: "chocolate", order: 0 },
  ]);

  console.log("Seed complete");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
