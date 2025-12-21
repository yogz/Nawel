import { db } from "@/lib/db";
import { events, days, people } from "@/drizzle/schema";
import { eq, isNull } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function fixEventIds() {
  console.log("🔧 Correction des eventId manquants...");

  try {
    // Trouver ou créer l'événement par défaut
    let defaultEvent = await db.query.events.findFirst({ where: eq(events.slug, "family") });
    
    if (!defaultEvent) {
      console.log("📅 Création de l'événement par défaut 'Noël soussey'...");
      const [created] = await db
        .insert(events)
        .values({
          slug: "family",
          name: "Noël soussey",
          description: "Événement par défaut",
        })
        .returning();
      defaultEvent = created;
      console.log(`✅ Événement créé avec l'ID: ${defaultEvent.id}`);
    } else {
      console.log(`✅ Événement trouvé avec l'ID: ${defaultEvent.id}`);
    }

    // Mettre à jour tous les jours sans eventId
    console.log("🔗 Liaison des jours à l'événement...");
    const daysWithoutEvent = await db.select().from(days).where(isNull(days.eventId));
    for (const day of daysWithoutEvent) {
      await db.update(days).set({ eventId: defaultEvent.id }).where(eq(days.id, day.id));
      console.log(`  ✓ Jour ${day.id} lié à l'événement`);
    }
    if (daysWithoutEvent.length === 0) {
      console.log("  ℹ️  Tous les jours sont déjà liés");
    }

    // Mettre à jour toutes les personnes sans eventId
    console.log("👥 Liaison des personnes à l'événement...");
    const peopleWithoutEvent = await db.select().from(people).where(isNull(people.eventId));
    for (const person of peopleWithoutEvent) {
      await db.update(people).set({ eventId: defaultEvent.id }).where(eq(people.id, person.id));
      console.log(`  ✓ Personne ${person.id} liée à l'événement`);
    }
    if (peopleWithoutEvent.length === 0) {
      console.log("  ℹ️  Toutes les personnes sont déjà liées");
    }

    console.log("✨ Correction terminée avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de la correction :", error);
    process.exit(1);
  }
}

fixEventIds();

