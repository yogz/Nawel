import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "@drizzle/schema";
import { SESSION_EXPIRE_DAYS, SESSION_REFRESH_DAYS } from "./constants";
import { Resend } from "resend";
import { getTranslations } from "next-intl/server";
import { Redis } from "@upstash/redis";

const resend = new Resend(process.env.RESEND_API_KEY!);

// Upstash Redis for rate limiting
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

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
  baseURL: (process.env.BETTER_AUTH_URL || "https://www.colist.fr").replace(/\/$/, ""),
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
    requireEmailVerification: false, // Allow auto-login before verification; banner will remind them
    sendResetPassword: async ({
      user,
      url,
      token,
    }: {
      user: { email: string; language?: string | null };
      url: string;
      token: string;
    }) => {
      const locale = user.language || "fr";
      const t = await getTranslations({
        locale,
        namespace: "Login.EmailReset",
      });

      let origin = (process.env.BETTER_AUTH_URL || "https://www.colist.fr").replace(/\/$/, "");
      try {
        const extracted = new URL(url).origin;
        if (extracted && extracted.includes(".")) origin = extracted;
      } catch (e) {
        // use default origin
      }

      const resetUrl = `${origin}/${locale}/reset-password?token=${token}`;

      const { error } = await resend.emails.send({
        from: "CoList <hello@colist.fr>",
        to: user.email,
        subject: t("subject"),
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h1 style="color: #333; font-size: 24px;">${t("subject")}</h1>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">${t("body")}</p>
            <div style="margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; font-weight: 600;">
                ${t("button")}
              </a>
            </div>
            <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eaeaea;" />
            <p style="font-size: 14px; color: #999; line-height: 1.5;">${t("footer")}</p>
          </div>
        `,
      });

      if (error) {
        console.error("[Password Reset] Failed to send email:", error);
      }
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      mapProfileToImage: true,
    },
  },
  accountLinking: {
    enabled: true,
    trustedProviders: ["google"],
  },
  plugins: [
    admin({
      adminRoles: ["admin"],
    }),
    magicLink({
      sendMagicLink: async ({
        email,
        url,
        token,
      }: {
        email: string;
        url: string;
        token: string;
      }) => {
        // Try to find user to get their language preference
        const user = await db.query.user.findFirst({
          where: (u, { eq }) => eq(u.email, email),
        });
        const locale = user?.language || "fr";

        const t = await getTranslations({
          locale,
          namespace: "Login.MagicLink",
        });

        let origin = (process.env.BETTER_AUTH_URL || "https://www.colist.fr").replace(/\/$/, "");
        try {
          const extracted = new URL(url).origin;
          if (extracted && extracted.includes(".")) origin = extracted;
        } catch (e) {
          // use default origin
        }

        const magicUrl = `${origin}/${locale}/login?token=${token}`;

        const { error } = await resend.emails.send({
          from: "CoList <hello@colist.fr>",
          to: email,
          subject: t("subject"),
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
              <h1 style="color: #333; font-size: 24px;">${t("subject")}</h1>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">${t("body")}</p>
              <div style="margin: 30px 0;">
                <a href="${magicUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; font-weight: 600;">
                  ${t("button")}
                </a>
              </div>
              <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eaeaea;" />
              <p style="font-size: 14px; color: #999; line-height: 1.5;">${t("footer")}</p>
            </div>
          `,
        });

        if (error) {
          console.error("[Magic Link] Failed to send email:", error);
        }
      },
    }),
  ],
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({
      user,
      url,
      token,
    }: {
      user: { email: string; language?: string | null };
      url: string;
      token: string;
    }) => {
      const locale = user.language || "fr";
      const t = await getTranslations({
        locale,
        namespace: "Login.EmailVerification",
      });

      let origin = (process.env.BETTER_AUTH_URL || "https://www.colist.fr").replace(/\/$/, "");
      try {
        const extracted = new URL(url).origin;
        if (extracted && extracted.includes(".")) origin = extracted;
      } catch (e) {
        // use default origin
      }

      const verifyUrl = `${origin}/${locale}/verify-email?token=${token}`;

      const { error } = await resend.emails.send({
        from: "CoList <hello@colist.fr>",
        to: user.email,
        subject: t("subject"),
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h1 style="color: #333; font-size: 24px;">${t("subject")}</h1>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">${t("body")}</p>
            <div style="margin: 30px 0;">
              <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; font-weight: 600;">
                ${t("button")}
              </a>
            </div>
            <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eaeaea;" />
            <p style="font-size: 14px; color: #999; line-height: 1.5;">${t("footer")}</p>
          </div>
        `,
      });

      if (error) {
        console.error("[Email Verification] Failed to send email:", error);
      }
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * SESSION_EXPIRE_DAYS,
    updateAge: 60 * 60 * 24 * SESSION_REFRESH_DAYS,
  },
  // Upstash Redis for rate limiting storage
  ...(redis && {
    secondaryStorage: {
      get: async (key: string) => {
        const value = await redis.get<string>(key);
        return value ?? null;
      },
      set: async (key: string, value: string, ttl?: number) => {
        if (ttl) {
          await redis.set(key, value, { ex: ttl });
        } else {
          await redis.set(key, value);
        }
      },
      delete: async (key: string) => {
        await redis.del(key);
      },
    },
  }),
  // Rate limiting configuration
  rateLimit: {
    enabled: true,
    window: 60, // 1 minute window
    max: 100, // max 100 requests per window (general)
    storage: redis ? "secondary-storage" : "memory",
    customRules: {
      // Stricter limits for auth endpoints to prevent brute force
      "/sign-in/email": {
        window: 60,
        max: 5, // 5 attempts per minute
      },
      "/sign-in/magic-link": {
        window: 60,
        max: 5,
      },
      "/sign-up/email": {
        window: 60,
        max: 3, // 3 sign-ups per minute
      },
      "/forgot-password": {
        window: 300, // 5 minute window
        max: 3, // 3 attempts per 5 minutes
      },
    },
  },
  logger: {
    level: process.env.NODE_ENV === "production" ? "error" : "warn",
    log: (level, message, ...args) => {
      // Filter out negative timeout warnings to reduce noise
      if (message.includes("TimeoutNegativeWarning") || message.includes("negative number")) {
        // Log at debug level instead of error/warn
        if (process.env.NODE_ENV === "development") {
          console.debug(`[Better Auth ${level}] ${message}`, ...args);
        }
        return;
      }
      // Log other messages normally
      if (level === "error") {
        console.error(`[Better Auth] ${message}`, ...args);
      } else if (level === "warn") {
        console.warn(`[Better Auth] ${message}`, ...args);
      } else if (process.env.NODE_ENV === "development") {
        console.log(`[Better Auth ${level}] ${message}`, ...args);
      }
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      language: {
        type: "string",
        defaultValue: "fr",
      },
      emoji: {
        type: "string",
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
