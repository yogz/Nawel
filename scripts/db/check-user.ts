import { db } from "../../src/lib/db";
import { user } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

async function run() {
  const email = "nicolas.a.perez@gmail.com";
  console.log(`Checking for user: ${email}`);
  const u = await db.query.user.findFirst({
    where: eq(user.email, email),
  });

  if (!u) {
    console.log("User not found in database.");
  } else {
    console.log(`User found! ID: ${u.id}`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
