import { db } from "../lib/db";
import { people } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function updateMichel() {
  console.log("🔄 Mise à jour de Michel -> Michelle...");

  try {
    // Mettre à jour tous les "Michel" en "Michelle"
    const result = await db
      .update(people)
      .set({ name: "Michelle" })
      .where(eq(people.name, "Michel"))
      .returning();

    if (result.length > 0) {
      console.log(`✅ ${result.length} personne(s) mise(s) à jour :`);
      result.forEach((person) => {
        console.log(`   - ID ${person.id}: ${person.name}`);
      });
    } else {
      console.log("ℹ️  Aucune personne nommée 'Michel' trouvée dans la base de données.");
    }

    console.log("✨ Mise à jour terminée !");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour:", error);
    process.exit(1);
  }
}

updateMichel();

