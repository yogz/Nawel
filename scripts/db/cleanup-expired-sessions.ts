import * as dotenv from "dotenv";
dotenv.config();

import { db } from "../../src/lib/db";
import { session } from "../../drizzle/schema";
import { lt, sql } from "drizzle-orm";

/**
 * Cleanup script to remove expired sessions from the database.
 * This prevents Better Auth from trying to calculate negative timeout values
 * when processing expired sessions.
 */
async function cleanupExpiredSessions() {
  console.log("Starting cleanup of expired sessions...");

  try {
    // Use SQL NOW() to ensure timezone consistency
    const result = await db
      .delete(session)
      .where(lt(session.expiresAt, sql`NOW()`))
      .returning({ id: session.id });

    console.log(`Cleaned up ${result.length} expired session(s)`);

    if (result.length > 0) {
      console.log("Deleted session IDs:", result.map((s) => s.id).join(", "));
    }
  } catch (error) {
    console.error("Error cleaning up expired sessions:", error);
    throw error;
  }
}

// Run cleanup if script is executed directly
if (require.main === module) {
  cleanupExpiredSessions()
    .then(() => {
      console.log("Cleanup completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Cleanup failed:", error);
      process.exit(1);
    });
}

export { cleanupExpiredSessions };
