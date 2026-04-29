import * as dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@drizzle/schema-index";

// Charger les variables d'environnement si elles ne sont pas déjà chargées
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: ".env" });
}

// Avoid throwing at module load time so Next.js can still collect page data
// for routes that import `db` in environments where DATABASE_URL hasn't been
// provisioned (Vercel preview builds without the production scope, CI, etc.).
// The connection itself is lazy — the real error surfaces at first query.
type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let cached: DbClient | null = null;

function resolveClient(): DbClient {
  if (cached) {
    return cached;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  // Configuration adaptée Vercel Fluid Compute : une instance Function
  // est réutilisée entre invocations parallèles, donc max:1 sériel les
  // queries d'une même instance — l'opposé de l'objectif Fluid. max:5
  // permet d'exploiter la concurrence intra-instance sans saturer le
  // pooler côté DB. idle_timeout:20s libère vite quand l'instance dort.
  const client = postgres(url, {
    max: 5,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });
  cached = drizzle(client, { schema });
  return cached;
}

export const db = new Proxy({} as DbClient, {
  get(_, prop, receiver) {
    const target = resolveClient() as unknown as Record<string | symbol, unknown>;
    const value = target[prop as string];
    return typeof value === "function" ? (value as Function).bind(target) : value;
  },
}) as DbClient;
