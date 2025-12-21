import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/drizzle/schema";

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
