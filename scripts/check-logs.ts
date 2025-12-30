import { db } from "../src/lib/db";
import { changeLogs } from "../drizzle/schema";
import { like, or } from "drizzle-orm";

async function checkChangeLogs() {
  try {
    const logs = await db.query.changeLogs.findMany({
      where: or(like(changeLogs.newData, "%test%"), like(changeLogs.oldData, "%test%")),
      limit: 50,
    });

    if (logs.length > 0) {
      console.log("FOUND_LOGS:", JSON.stringify(logs, null, 2));
    } else {
      console.log("NO_TEST_LOGS_FOUND");
    }
  } catch (error) {
    console.error("ERROR_CHECKING_LOGS:", error);
  } finally {
    process.exit(0);
  }
}

checkChangeLogs();
