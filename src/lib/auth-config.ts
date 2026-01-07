import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "@drizzle/schema";
import { SESSION_EXPIRE_DAYS, SESSION_REFRESH_DAYS } from "./constants";
import { Resend } from "resend";
import { getTranslations } from "next-intl/server";

const resend = new Resend(process.env.RESEND_API_KEY!);

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
    requireEmailVerification: false, // Allow auto-login before verification; banner will remind them
    sendResetPassword: async ({ user, url, token }: { user: any; url: string; token: string }) => {
      const locale = user.language || "fr";
      const t = await getTranslations({
        locale,
        namespace: "Login.EmailReset",
      });

      const baseUrl = (process.env.BETTER_AUTH_URL || "").replace(/\/$/, "");
      const resetUrl = `${baseUrl}/${locale}/reset-password?token=${token}`;

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
  ],
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({
      user,
      url,
      token,
    }: {
      user: any;
      url: string;
      token: string;
    }) => {
      const locale = user.language || "fr";
      const t = await getTranslations({
        locale,
        namespace: "Login.EmailVerification",
      });

      const baseUrl = (process.env.BETTER_AUTH_URL || "").replace(/\/$/, "");
      const verifyUrl = `${baseUrl}/${locale}/verify-email?token=${token}`;

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
