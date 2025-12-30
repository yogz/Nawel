import { db } from "../src/lib/db";
import { changeLogs } from "../drizzle/schema";
import { like } from "drizzle-orm";

async function checkExactTestLog() {
  try {
    const logs = await db.query.changeLogs.findMany({
      where: like(changeLogs.newData, '%"slug":"test"%'),
      limit: 10,
    });

    console.log("EXACT_TEST_LOGS:", JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    process.exit(0);
  }
}

checkExactTestLog();
