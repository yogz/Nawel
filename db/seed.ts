import * as dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import { days, items, meals, people } from "../drizzle/schema";

// Charger les variables d'environnement
dotenv.config({ path: ".env" });

type PersonId =
  | "nicolas"
  | "antoine"
  | "yann"
  | "alexandre"
  | "annabelle"
  | "camille"
  | "caroline"
  | "francoise"
  | "gregory"
  | "isabelle"
  | "adeline"
  | "gael"
  | "joel"
  | "karine"
  | "michel"
  | "nicolas-b"
  | "odile"
  | "jacques";

type DayId = "day-communal-2425" | "day-2025-12-24" | "day-2025-12-25";
type MealId =
  | "meal-aperitif"
  | "meal-boissons"
  | "meal-petits-plus"
  | "meal-diner-24"
  | "meal-repas-25"
  | "meal-desserts";

const seedPeople: Array<{ id: PersonId; name: string }> = [
  { id: "nicolas", name: "Nicolas" },
  { id: "antoine", name: "Antoine" },
  { id: "yann", name: "Yann" },
  { id: "alexandre", name: "Alexandre" },
  { id: "annabelle", name: "Annabelle" },
  { id: "camille", name: "Camille" },
  { id: "caroline", name: "Caroline" },
  { id: "francoise", name: "Françoise" },
  { id: "gregory", name: "Grégory" },
  { id: "isabelle", name: "Isabelle" },
  { id: "adeline", name: "Adeline" },
  { id: "gael", name: "Gaël" },
  { id: "joel", name: "Joël" },
  { id: "karine", name: "Karine" },
  { id: "michel", name: "Michel" },
  { id: "nicolas-b", name: "Nicolas B" },
  { id: "odile", name: "Odile" },
  { id: "jacques", name: "Jacques" },
];

const seedDays: Array<{ id: DayId; date: string; title: string }> = [
  { id: "day-communal-2425", date: "2025-12-24", title: "Commun (24–25)" },
  { id: "day-2025-12-24", date: "2025-12-24", title: "24/12" },
  { id: "day-2025-12-25", date: "2025-12-25", title: "25/12" },
];

const seedMeals: Array<{ id: MealId; dayId: DayId; title: string; order: number }> = [
  { id: "meal-aperitif", dayId: "day-communal-2425", title: "Apéritif", order: 1 },
  { id: "meal-boissons", dayId: "day-communal-2425", title: "Boissons", order: 2 },
  { id: "meal-petits-plus", dayId: "day-communal-2425", title: "Petits plus", order: 3 },
  { id: "meal-diner-24", dayId: "day-2025-12-24", title: "Dîner", order: 1 },
  { id: "meal-repas-25", dayId: "day-2025-12-25", title: "Repas", order: 1 },
  { id: "meal-desserts", dayId: "day-2025-12-25", title: "Desserts", order: 2 },
];

const seedItems: Array<{
  id: string;
  mealId: MealId;
  name: string;
  quantity: string | null;
  note: string | null;
  assignee: PersonId | null;
  order: number;
}> = [
  // Apéritif
  { id: "item-pruneaux-lardes", mealId: "meal-aperitif", name: "Pruneaux lardés", quantity: null, note: null, assignee: "gregory", order: 1 },
  { id: "item-verrines-betterave", mealId: "meal-aperitif", name: "Verrines de betterave", quantity: null, note: null, assignee: null, order: 2 },
  { id: "item-rillettes", mealId: "meal-aperitif", name: "Rillettes", quantity: null, note: null, assignee: "jacques", order: 3 },
  { id: "item-saucisson", mealId: "meal-aperitif", name: "Saucisson", quantity: null, note: null, assignee: "jacques", order: 4 },
  { id: "item-brochettes", mealId: "meal-aperitif", name: "Petites brochettes", quantity: null, note: null, assignee: "gregory", order: 5 },
  { id: "item-plateau-crudites", mealId: "meal-aperitif", name: "Plateau de crudités", quantity: null, note: "carottes, etc.", assignee: null, order: 6 },
  { id: "item-houmous", mealId: "meal-aperitif", name: "Houmous", quantity: null, note: null, assignee: "karine", order: 7 },
  { id: "item-mousse", mealId: "meal-aperitif", name: "Mousse", quantity: null, note: 'à préciser ("du mousse")', assignee: null, order: 8 },
  { id: "item-endives-roquefort", mealId: "meal-aperitif", name: "Endives au roquefort", quantity: null, note: null, assignee: null, order: 9 },
  { id: "item-toasts-foie-gras", mealId: "meal-aperitif", name: "Toasts au foie gras", quantity: null, note: null, assignee: null, order: 10 },
  { id: "item-escargots-petit-pot", mealId: "meal-aperitif", name: "Escargots en petit pot", quantity: null, note: null, assignee: null, order: 11 },
  { id: "item-huitres-aperitif", mealId: "meal-aperitif", name: "Huîtres", quantity: null, note: "optionnel / peut-être", assignee: null, order: 12 },
  { id: "item-fruits-aperitif", mealId: "meal-aperitif", name: "Fruits", quantity: null, note: null, assignee: "karine", order: 13 },

  // Boissons
  { id: "item-champagne-6", mealId: "meal-boissons", name: "Champagne", quantity: "6 bouteilles", note: null, assignee: "michel", order: 1 },
  { id: "item-cubit-5l", mealId: "meal-boissons", name: "Cubit", quantity: "5 litres", note: null, assignee: "michel", order: 2 },
  { id: "item-vin-rouge", mealId: "meal-boissons", name: "Vin rouge", quantity: null, note: null, assignee: "yann", order: 3 },
  { id: "item-chateauneuf-6", mealId: "meal-boissons", name: "Châteauneuf (à préciser)", quantity: "6 bouteilles", note: 'Tu as dit "Chateaumeric"', assignee: "karine", order: 4 },
  { id: "item-biere", mealId: "meal-boissons", name: "Bière", quantity: null, note: "Caroline & Annabelle", assignee: "caroline", order: 5 },
  { id: "item-tourtelle-twist", mealId: "meal-boissons", name: "Tourtel Twist", quantity: null, note: null, assignee: null, order: 6 },
  { id: "item-softs", mealId: "meal-boissons", name: "Softs", quantity: null, note: "jus de pomme, Ice Tea, etc.", assignee: null, order: 7 },

  // Petits plus
  { id: "item-truffes", mealId: "meal-petits-plus", name: "Truffes au chocolat", quantity: null, note: null, assignee: "isabelle", order: 1 },
  { id: "item-fruits-deguises", mealId: "meal-petits-plus", name: "Fruits déguisés", quantity: null, note: null, assignee: null, order: 2 },
  { id: "item-litchis", mealId: "meal-petits-plus", name: "Litchis", quantity: null, note: null, assignee: null, order: 3 },
  { id: "item-clementines", mealId: "meal-petits-plus", name: "Clémentines", quantity: null, note: null, assignee: null, order: 4 },

  // 24/12 Dîner
  { id: "item-raclette-fromage", mealId: "meal-diner-24", name: "Raclette (fromage)", quantity: "4 kg", note: "Caroline & Annabelle", assignee: "caroline", order: 1 },
  { id: "item-charcuterie-24", mealId: "meal-diner-24", name: "Charcuterie", quantity: null, note: null, assignee: null, order: 2 },
  { id: "item-salade-24", mealId: "meal-diner-24", name: "Salade", quantity: null, note: null, assignee: null, order: 3 },
  { id: "item-pommes-de-terre-24", mealId: "meal-diner-24", name: "Pommes de terre", quantity: null, note: null, assignee: null, order: 4 },

  // 25/12 Repas
  { id: "item-boudin-blanc", mealId: "meal-repas-25", name: "Boudin blanc", quantity: null, note: null, assignee: "jacques", order: 1 },
  { id: "item-compote-pommes", mealId: "meal-repas-25", name: "Compote de pommes", quantity: null, note: null, assignee: "jacques", order: 2 },
  { id: "item-puree", mealId: "meal-repas-25", name: "Purée", quantity: null, note: null, assignee: null, order: 3 },
  { id: "item-compotee-oignons", mealId: "meal-repas-25", name: "Compotée d’oignons", quantity: null, note: null, assignee: null, order: 4 },
  { id: "item-quenelles", mealId: "meal-repas-25", name: "Quenelles", quantity: null, note: null, assignee: "jacques", order: 5 },
  { id: "item-gateau-chocolat", mealId: "meal-repas-25", name: "Gâteau au chocolat", quantity: null, note: null, assignee: null, order: 6 },
  { id: "item-gateau-roule-ou-buche", mealId: "meal-repas-25", name: "Gâteau roulé ou bûche", quantity: null, note: null, assignee: null, order: 7 },
  { id: "item-huitres-25", mealId: "meal-repas-25", name: "Huîtres", quantity: null, note: null, assignee: null, order: 8 },
  { id: "item-cornichons", mealId: "meal-repas-25", name: "Cornichons", quantity: null, note: null, assignee: null, order: 9 },

  // Desserts
  { id: "item-salade-agrumes", mealId: "meal-desserts", name: "Salade orange / ananas / fleur d’oranger", quantity: null, note: null, assignee: null, order: 1 },
  { id: "item-financiers", mealId: "meal-desserts", name: "Financiers", quantity: null, note: null, assignee: null, order: 2 },
];

async function run() {
  console.log("🌱 Seeding…");

  // Deletions first due to FKs
  await db.delete(items);
  await db.delete(meals);
  await db.delete(days);
  await db.delete(people);

  // 1. Seed People and get mapping
  const personMapping: Record<PersonId, number> = {} as any;
  for (const person of seedPeople) {
    const [row] = await db.insert(people).values({ name: person.name }).returning();
    personMapping[person.id] = row.id;
  }
  console.log(`✅ Seeded ${seedPeople.length} people.`);

  // 2. Seed Days and get mapping
  const dayMapping: Record<DayId, number> = {} as any;
  for (const day of seedDays) {
    const [row] = await db.insert(days).values({ date: day.date, title: day.title }).returning();
    dayMapping[day.id] = row.id;
  }
  console.log(`✅ Seeded ${seedDays.length} days.`);

  // 3. Seed Meals and get mapping
  const mealMapping: Record<MealId, number> = {} as any;
  for (const meal of seedMeals) {
    const [row] = await db
      .insert(meals)
      .values({
        dayId: dayMapping[meal.dayId],
        title: meal.title,
        order: meal.order,
      })
      .returning();
    mealMapping[meal.id] = row.id;
  }
  console.log(`✅ Seeded ${seedMeals.length} meals.`);

  // 4. Seed Items
  const itemsToInsert = seedItems.map((it) => ({
    mealId: mealMapping[it.mealId],
    name: it.name,
    quantity: it.quantity,
    note: it.note,
    personId: it.assignee ? personMapping[it.assignee] : null,
    order: it.order,
  }));

  await db.insert(items).values(itemsToInsert);
  console.log(`✅ Seeded ${seedItems.length} items.`);

  console.log("✨ Seed successful!");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });

