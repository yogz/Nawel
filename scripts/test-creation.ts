import { db } from "../src/lib/db";
import { events } from "../drizzle/schema";

async function tryCreateTest() {
  try {
    const [created] = await db
      .insert(events)
      .values({
        slug: "test",
        name: "Test Event",
        adminKey: "test-key",
      })
      .returning();

    console.log("SUCCESS_CREATED:", JSON.stringify(created));

    // Clean up
    await db.delete(events).where({ id: created.id });
    console.log("CLEANUP_SUCCESS");
  } catch (error) {
    console.error("CREATION_FAILED:", error);
  } finally {
    process.exit(0);
  }
}

tryCreateTest();
