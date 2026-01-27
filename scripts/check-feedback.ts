import { db } from "@/lib/db";
import { feedback } from "@drizzle/schema";

async function main() {
  console.log("Checking feedback table...");
  try {
    const allFeedback = await db.select().from(feedback);
    console.log(`Found ${allFeedback.length} feedback entries.`);
    allFeedback.forEach((f) => {
      console.log(`- ID: ${f.id}, User: ${f.userId}, Content: ${f.content}, Date: ${f.createdAt}`);
    });
  } catch (error) {
    console.error("Error querying feedback:", error);
  }
  process.exit(0);
}

main();
