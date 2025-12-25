import { db } from "@/lib/db";
import { events, meals, people } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function migrateToEvents() {
  console.log("🔄 Migration vers le système d'événements...");

  try {
    // Vérifier s'il existe déjà des événements
    const existingEvents = await db.select().from(events);
    if (existingEvents.length > 0) {
      console.log("ℹ️  Des événements existent déjà. Migration ignorée.");
      return;
    }

    // Créer un événement par défaut
    console.log("📅 Création de l'événement par défaut 'Noël soussey'...");
    const [defaultEvent] = await db
      .insert(events)
      .values({
        slug: "family",
        name: "Noël soussey",
        description: "Événement par défaut",
      })
      .returning();

    console.log(`✅ Événement créé avec l'ID: ${defaultEvent.id}`);

    // Mettre à jour tous les repas existants pour les lier à l'événement
    console.log("🔗 Liaison des repas à l'événement...");
    const allMeals = await db.select().from(meals);
    for (const meal of allMeals) {
      await db.update(meals).set({ eventId: defaultEvent.id }).where(eq(meals.id, meal.id));
      console.log(`  ✓ Repas ${meal.id} lié à l'événement`);
    }

    // Mettre à jour toutes les personnes existantes pour les lier à l'événement
    console.log("👥 Liaison des personnes à l'événement...");
    const allPeople = await db.select().from(people);
    for (const person of allPeople) {
      await db.update(people).set({ eventId: defaultEvent.id }).where(eq(people.id, person.id));
      console.log(`  ✓ Personne ${person.id} liée à l'événement`);
    }

    console.log("✨ Migration terminée avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de la migration :", error);
    process.exit(1);
  }
}

migrateToEvents();
