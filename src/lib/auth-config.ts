import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "@drizzle/schema";
import { SESSION_EXPIRE_DAYS, SESSION_REFRESH_DAYS } from "./constants";

// Parse trusted origins from environment variable, with safe defaults for development
const getTrustedOrigins = (): string[] => {
  const envOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS;
  if (envOrigins) {
    return envOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
  // Development-only defaults (production should always set BETTER_AUTH_TRUSTED_ORIGINS)
  if (process.env.NODE_ENV === "development") {
    return ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"];
  }
  // Production: only trust the configured base URL
  return process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL.replace(/\/$/, "")] : [];
};

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: getTrustedOrigins(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    admin({
      adminRoles: ["admin"],
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * SESSION_EXPIRE_DAYS,
    updateAge: 60 * 60 * 24 * SESSION_REFRESH_DAYS,
  },
});

export type Session = typeof auth.$Infer.Session;
