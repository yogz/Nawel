import { db } from "./src/lib/db";
import { events } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function checkTestEvent() {
  try {
    const event = await db.query.events.findFirst({
      where: eq(events.slug, "test"),
    });

    if (event) {
      console.log("FOUND_EVENT:", JSON.stringify(event));
    } else {
      console.log("EVENT_NOT_FOUND");
    }
  } catch (error) {
    console.error("ERROR_CHECKING_EVENT:", error);
  } finally {
    process.exit(0);
  }
}

checkTestEvent();
