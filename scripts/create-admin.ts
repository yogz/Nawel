import * as dotenv from "dotenv";
dotenv.config();

import { auth } from "../lib/auth-config";

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || "Admin";

if (!email || !password) {
  console.error("Usage: npx tsx scripts/create-admin.ts <email> <password> [name]");
  process.exit(1);
}

async function createAdmin() {
  console.log(`Creating admin user: ${email}...`);

  try {
    // Create user via Better Auth API
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (!result?.user) {
      throw new Error("Failed to create user");
    }

    // Set role to admin directly in database
    const { db } = await import("../lib/db");
    const { user } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    await db.update(user).set({ role: "admin" }).where(eq(user.id, result.user.id));

    console.log(`Admin user created successfully!`);
    console.log(`Email: ${email}`);
    console.log(`Role: admin`);
  } catch (error: any) {
    console.error("Failed to create admin:", error.message || error);
    process.exit(1);
  }

  process.exit(0);
}

createAdmin();
