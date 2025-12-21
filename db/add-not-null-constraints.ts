import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function addNotNullConstraints() {
  console.log("🔧 Ajout des contraintes NOT NULL...");

  try {
    // S'assurer que tous les jours ont un eventId
    await db.execute(
      sql`UPDATE days SET event_id = (SELECT id FROM events WHERE slug = 'family' LIMIT 1) WHERE event_id IS NULL`
    );
    console.log("✓ Jours mis à jour");

    // S'assurer que toutes les personnes ont un eventId
    await db.execute(
      sql`UPDATE people SET event_id = (SELECT id FROM events WHERE slug = 'family' LIMIT 1) WHERE event_id IS NULL`
    );
    console.log("✓ Personnes mises à jour");

    // Ajouter les contraintes NOT NULL
    await db.execute(sql`ALTER TABLE days ALTER COLUMN event_id SET NOT NULL`);
    console.log("✓ Contrainte NOT NULL ajoutée à days.event_id");

    await db.execute(sql`ALTER TABLE people ALTER COLUMN event_id SET NOT NULL`);
    console.log("✓ Contrainte NOT NULL ajoutée à people.event_id");

    console.log("✨ Contraintes ajoutées avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des contraintes :", error);
    process.exit(1);
  }
}

addNotNullConstraints();

