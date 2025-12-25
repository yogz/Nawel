import { db } from "@/lib/db";
import { events } from "@drizzle/schema";
import { desc } from "drizzle-orm";

async function main() {
  console.log("Checking events table columns...");
  const latestEvent = await db.query.events.findFirst({
    orderBy: [desc(events.createdAt)],
  });

  if (latestEvent) {
    console.log("Latest event:", JSON.stringify(latestEvent, null, 2));
    if ("adults" in latestEvent && "children" in latestEvent) {
      console.log("✅ Columns 'adults' and 'children' exist.");
    } else {
      console.error("❌ Columns missing!");
    }
  } else {
    console.log("No events found to check.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
