import { db } from "../src/lib/db";
import { changeLogs } from "../drizzle/schema";
import { and, eq, like } from "drizzle-orm";

async function checkDeletionLog() {
  try {
    const logs = await db.query.changeLogs.findMany({
      where: and(
        eq(changeLogs.action, "delete"),
        eq(changeLogs.tableName, "events"),
        like(changeLogs.oldData, '%"slug":"test"%')
      ),
      limit: 10,
    });

    console.log("DELETION_LOGS:", JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    process.exit(0);
  }
}

checkDeletionLog();
