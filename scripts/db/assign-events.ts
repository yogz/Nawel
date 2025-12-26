import { db } from "../../src/lib/db";
import { events } from "../../drizzle/schema";
import { isNull } from "drizzle-orm";

async function run() {
  const userId = "IvGnqiWcWzC6odd9QcGAhjWuKe2C5SB4";
  console.log(`Assigning events to user ID: ${userId}`);

  const updated = await db
    .update(events)
    .set({ ownerId: userId })
    .where(isNull(events.ownerId))
    .returning();

  console.log(`Updated ${updated.length} events:`);
  updated.forEach((e) => console.log(`- ${e.name} (${e.slug})`));

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
