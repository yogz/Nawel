import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { meals, items, services, people, events } from "@drizzle/schema";

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

type MealId = "meal-communal-2425" | "meal-2025-12-24" | "meal-2025-12-25";
type ServiceId =
  | "service-aperitif"
  | "service-boissons"
  | "service-petits-plus"
  | "service-diner-24"
  | "service-repas-25"
  | "service-desserts";

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
  { id: "michel", name: "Michelle" },
  { id: "nicolas-b", name: "Nicolas B" },
  { id: "odile", name: "Odile" },
  { id: "jacques", name: "Jacques" },
];

const seedMeals: Array<{ id: MealId; date: string; title: string }> = [
  { id: "meal-communal-2425", date: "2025-12-24", title: "Commun (24–25)" },
  { id: "meal-2025-12-24", date: "2025-12-24", title: "24/12" },
  { id: "meal-2025-12-25", date: "2025-12-25", title: "25/12" },
];

const seedServices: Array<{ id: ServiceId; mealId: MealId; title: string; order: number }> = [
  { id: "service-aperitif", mealId: "meal-communal-2425", title: "Apéritif", order: 1 },
  { id: "service-boissons", mealId: "meal-communal-2425", title: "Boissons", order: 2 },
  { id: "service-petits-plus", mealId: "meal-communal-2425", title: "Petits plus", order: 3 },
  { id: "service-diner-24", mealId: "meal-2025-12-24", title: "Dîner", order: 1 },
  { id: "service-repas-25", mealId: "meal-2025-12-25", title: "Repas", order: 1 },
  { id: "service-desserts", mealId: "meal-2025-12-25", title: "Desserts", order: 2 },
];

const seedItems: Array<{
  id: string;
  serviceId: ServiceId;
  name: string;
  quantity: string | null;
  note: string | null;
  assignee: PersonId | null;
  order: number;
}> = [
  // Apéritif
  {
    id: "item-pruneaux-lardes",
    serviceId: "service-aperitif",
    name: "Pruneaux lardés",
    quantity: null,
    note: null,
    assignee: "gregory",
    order: 1,
  },
  {
    id: "item-verrines-betterave",
    serviceId: "service-aperitif",
    name: "Verrines de betterave",
    quantity: null,
    note: null,
    assignee: null,
    order: 2,
  },
  {
    id: "item-rillettes",
    serviceId: "service-aperitif",
    name: "Rillettes",
    quantity: null,
    note: null,
    assignee: "jacques",
    order: 3,
  },
  {
    id: "item-saucisson",
    serviceId: "service-aperitif",
    name: "Saucisson",
    quantity: null,
    note: null,
    assignee: "jacques",
    order: 4,
  },
  {
    id: "item-brochettes",
    serviceId: "service-aperitif",
    name: "Petites brochettes",
    quantity: null,
    note: null,
    assignee: "gregory",
    order: 5,
  },
  {
    id: "item-plateau-crudites",
    serviceId: "service-aperitif",
    name: "Plateau de crudités",
    quantity: null,
    note: "carottes, etc.",
    assignee: null,
    order: 6,
  },
  {
    id: "item-houmous",
    serviceId: "service-aperitif",
    name: "Houmous",
    quantity: null,
    note: null,
    assignee: "karine",
    order: 7,
  },
  {
    id: "item-mousse",
    serviceId: "service-aperitif",
    name: "Mousse",
    quantity: null,
    note: 'à préciser ("du mousse")',
    assignee: null,
    order: 8,
  },
  {
    id: "item-endives-roquefort",
    serviceId: "service-aperitif",
    name: "Endives au roquefort",
    quantity: null,
    note: null,
    assignee: null,
    order: 9,
  },
  {
    id: "item-toasts-foie-gras",
    serviceId: "service-aperitif",
    name: "Toasts au foie gras",
    quantity: null,
    note: null,
    assignee: null,
    order: 10,
  },
  {
    id: "item-escargots-petit-pot",
    serviceId: "service-aperitif",
    name: "Escargots en petit pot",
    quantity: null,
    note: null,
    assignee: null,
    order: 11,
  },
  {
    id: "item-huitres-aperitif",
    serviceId: "service-aperitif",
    name: "Huîtres",
    quantity: null,
    note: "optionnel / peut-être",
    assignee: null,
    order: 12,
  },
  {
    id: "item-fruits-aperitif",
    serviceId: "service-aperitif",
    name: "Fruits",
    quantity: null,
    note: null,
    assignee: "karine",
    order: 13,
  },

  // Boissons
  {
    id: "item-champagne-6",
    serviceId: "service-boissons",
    name: "Champagne",
    quantity: "6 bouteilles",
    note: null,
    assignee: "michel",
    order: 1,
  },
  {
    id: "item-cubit-5l",
    serviceId: "service-boissons",
    name: "Cubit",
    quantity: "5 litres",
    note: null,
    assignee: "michel",
    order: 2,
  },
  {
    id: "item-vin-rouge",
    serviceId: "service-boissons",
    name: "Vin rouge",
    quantity: null,
    note: null,
    assignee: "yann",
    order: 3,
  },
  {
    id: "item-chateauneuf-6",
    serviceId: "service-boissons",
    name: "Châteauneuf (à préciser)",
    quantity: "6 bouteilles",
    note: 'Tu as dit "Chateaumeric"',
    assignee: "karine",
    order: 4,
  },
  {
    id: "item-biere",
    serviceId: "service-boissons",
    name: "Bière",
    quantity: null,
    note: "Caroline & Annabelle",
    assignee: "caroline",
    order: 5,
  },
  {
    id: "item-tourtelle-twist",
    serviceId: "service-boissons",
    name: "Tourtel Twist",
    quantity: null,
    note: null,
    assignee: null,
    order: 6,
  },
  {
    id: "item-softs",
    serviceId: "service-boissons",
    name: "Softs",
    quantity: null,
    note: "jus de pomme, Ice Tea, etc.",
    assignee: null,
    order: 7,
  },

  // Petits plus
  {
    id: "item-truffes",
    serviceId: "service-petits-plus",
    name: "Truffes au chocolat",
    quantity: null,
    note: null,
    assignee: "isabelle",
    order: 1,
  },
  {
    id: "item-fruits-deguises",
    serviceId: "service-petits-plus",
    name: "Fruits déguisés",
    quantity: null,
    note: null,
    assignee: null,
    order: 2,
  },
  {
    id: "item-litchis",
    serviceId: "service-petits-plus",
    name: "Litchis",
    quantity: null,
    note: null,
    assignee: null,
    order: 3,
  },
  {
    id: "item-clementines",
    serviceId: "service-petits-plus",
    name: "Clémentines",
    quantity: null,
    note: null,
    assignee: null,
    order: 4,
  },

  // 24/12 Dîner
  {
    id: "item-raclette-fromage",
    serviceId: "service-diner-24",
    name: "Raclette (fromage)",
    quantity: "4 kg",
    note: "Caroline & Annabelle",
    assignee: "caroline",
    order: 1,
  },
  {
    id: "item-charcuterie-24",
    serviceId: "service-diner-24",
    name: "Charcuterie",
    quantity: null,
    note: null,
    assignee: null,
    order: 2,
  },
  {
    id: "item-salade-24",
    serviceId: "service-diner-24",
    name: "Salade",
    quantity: null,
    note: null,
    assignee: null,
    order: 3,
  },
  {
    id: "item-pommes-de-terre-24",
    serviceId: "service-diner-24",
    name: "Pommes de terre",
    quantity: null,
    note: null,
    assignee: null,
    order: 4,
  },

  // 25/12 Repas
  {
    id: "item-boudin-blanc",
    serviceId: "service-repas-25",
    name: "Boudin blanc",
    quantity: null,
    note: null,
    assignee: "jacques",
    order: 1,
  },
  {
    id: "item-compote-pommes",
    serviceId: "service-repas-25",
    name: "Compote de pommes",
    quantity: null,
    note: null,
    assignee: "jacques",
    order: 2,
  },
  {
    id: "item-puree",
    serviceId: "service-repas-25",
    name: "Purée",
    quantity: null,
    note: null,
    assignee: null,
    order: 3,
  },
  {
    id: "item-compotee-oignons",
    serviceId: "service-repas-25",
    name: "Compotée d'oignons",
    quantity: null,
    note: null,
    assignee: null,
    order: 4,
  },
  {
    id: "item-quenelles",
    serviceId: "service-repas-25",
    name: "Quenelles",
    quantity: null,
    note: null,
    assignee: "jacques",
    order: 5,
  },
  {
    id: "item-gateau-chocolat",
    serviceId: "service-repas-25",
    name: "Gâteau au chocolat",
    quantity: null,
    note: null,
    assignee: null,
    order: 6,
  },
  {
    id: "item-gateau-roule-ou-buche",
    serviceId: "service-repas-25",
    name: "Gâteau roulé ou bûche",
    quantity: null,
    note: null,
    assignee: null,
    order: 7,
  },
  {
    id: "item-huitres-25",
    serviceId: "service-repas-25",
    name: "Huîtres",
    quantity: null,
    note: null,
    assignee: null,
    order: 8,
  },
  {
    id: "item-cornichons",
    serviceId: "service-repas-25",
    name: "Cornichons",
    quantity: null,
    note: null,
    assignee: null,
    order: 9,
  },

  // Desserts
  {
    id: "item-salade-agrumes",
    serviceId: "service-desserts",
    name: "Salade orange / ananas / fleur d'oranger",
    quantity: null,
    note: null,
    assignee: null,
    order: 1,
  },
  {
    id: "item-financiers",
    serviceId: "service-desserts",
    name: "Financiers",
    quantity: null,
    note: null,
    assignee: null,
    order: 2,
  },
];

async function run() {
  console.log("🌱 Seeding…");

  // Deletions first due to FKs
  await db.delete(items);
  await db.delete(services);
  await db.delete(meals);
  await db.delete(people);
  await db.delete(events);

  // Create default event
  const [defaultEvent] = await db
    .insert(events)
    .values({
      slug: "family",
      name: "Noël soussey",
      description: "Événement par défaut",
    })
    .returning();
  console.log(`✅ Created event: ${defaultEvent.name} (${defaultEvent.slug})`);

  // 1. Seed People and get mapping
  const personMapping: Record<PersonId, number> = {} as any;
  for (const person of seedPeople) {
    const [row] = await db
      .insert(people)
      .values({ eventId: defaultEvent.id, name: person.name })
      .returning();
    personMapping[person.id] = row.id;
  }
  console.log(`✅ Seeded ${seedPeople.length} people.`);

  // 2. Seed Meals and get mapping
  const mealMapping: Record<MealId, number> = {} as any;
  for (const meal of seedMeals) {
    const [row] = await db
      .insert(meals)
      .values({ eventId: defaultEvent.id, date: meal.date, title: meal.title })
      .returning();
    mealMapping[meal.id] = row.id;
  }
  console.log(`✅ Seeded ${seedMeals.length} meals.`);

  // 3. Seed Services and get mapping
  const serviceMapping: Record<ServiceId, number> = {} as any;
  for (const service of seedServices) {
    const [row] = await db
      .insert(services)
      .values({
        mealId: mealMapping[service.mealId],
        title: service.title,
        order: service.order,
      })
      .returning();
    serviceMapping[service.id] = row.id;
  }
  console.log(`✅ Seeded ${seedServices.length} services.`);

  // 4. Seed Items
  const itemsToInsert = seedItems.map((it) => ({
    serviceId: serviceMapping[it.serviceId],
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
