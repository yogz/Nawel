import * as dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@drizzle/schema";

// Charger les variables d'environnement si elles ne sont pas déjà chargées
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: ".env" });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Configuration optimisée pour serverless (Vercel)
const client = postgres(process.env.DATABASE_URL, {
  max: 1, // Limite à 1 connexion pour serverless
  idle_timeout: 20, // Ferme les connexions inactives après 20s
  max_lifetime: 60 * 30, // Max 30 minutes de vie pour une connexion
});

export const db = drizzle(client, { schema });
