import { db } from "@/lib/db";
import { events } from "@drizzle/schema";
import { desc } from "drizzle-orm";

async function main() {
  console.log("Fetching events...");
  const allEvents = await db.select().from(events).orderBy(desc(events.createdAt));

  console.log("\n--- Liste des événements ---");
  allEvents.forEach((event) => {
    console.log(`Nom: ${event.name}`);
    console.log(`Slug: ${event.slug}`);
    console.log(`Admin Key: ${event.adminKey}`);
    console.log(`Created At: ${event.createdAt}`);
    console.log("----------------------------");
  });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
