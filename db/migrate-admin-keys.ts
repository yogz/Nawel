import { db } from "@/lib/db";
import { events } from "@/drizzle/schema";
import { isNull } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function migrateAdminKeys() {
    const writeKey = process.env.WRITE_KEY;
    if (!writeKey) {
        console.error("❌ WRITE_KEY environment variable is not set.");
        process.exit(1);
    }

    console.log("🚀 Starting adminKey migration...");
    console.log(`Using WRITE_KEY: ${writeKey.slice(0, 3)}...`);

    // Update all events with null adminKey
    const result = await db
        .update(events)
        .set({ adminKey: writeKey })
        .where(isNull(events.adminKey))
        .returning();

    console.log(`✅ Successfully updated ${result.length} events with the current WRITE_KEY.`);
    process.exit(0);
}

migrateAdminKeys().catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
