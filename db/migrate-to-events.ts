import { db } from "@/lib/db";
import { events, days, people } from "@/drizzle/schema";
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

    // Mettre à jour tous les jours existants pour les lier à l'événement
    console.log("🔗 Liaison des jours à l'événement...");
    const allDays = await db.select().from(days);
    for (const day of allDays) {
      await db.update(days).set({ eventId: defaultEvent.id }).where(eq(days.id, day.id));
      console.log(`  ✓ Jour ${day.id} lié à l'événement`);
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


