import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "@drizzle/schema";
import { SESSION_EXPIRE_DAYS, SESSION_REFRESH_DAYS } from "./constants";
import { Resend } from "resend";
import { getTranslations } from "next-intl/server";
import { Redis } from "@upstash/redis";
import { buildSortieAuthEmail, isSortieOrigin } from "./auth-emails";

// Lazy init — passing undefined to `new Resend()` throws at module-load time,
// which breaks Next.js page-data collection on preview builds that don't have
// the API key scoped in. The client is only ever used inside send callbacks.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error("RESEND_API_KEY is not set");
    }
    _resend = new Resend(key);
  }
  return _resend;
}
const resend = new Proxy({} as Resend, {
  get(_, prop) {
    const target = getResend() as unknown as Record<string | symbol, unknown>;
    const value = target[prop as string];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value;
  },
}) as Resend;

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
    return [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://sortie.localhost:3000",
      "http://sortie.localhost:3001",
    ];
  }
  // Production : on inclut explicitement le sub-domain Sortie en plus
  // du `BETTER_AUTH_URL` (= www). Sans ça, tout `signIn` /
  // `signUp` / `magicLink.signIn` lancé depuis `sortie.colist.fr`
  // retourne 403 — Better Auth refuse les requêtes dont l'`Origin`
  // n'est pas trusted. La hardcode garantit que le déploiement ne
  // casse pas si la env var n'est pas configurée ; pour overrider,
  // set `BETTER_AUTH_TRUSTED_ORIGINS=https://...,https://...` côté
  // Vercel.
  const baseUrl = process.env.BETTER_AUTH_URL?.replace(/\/$/, "");
  const sortieOrigin = "https://sortie.colist.fr";
  return baseUrl ? [baseUrl, sortieOrigin] : [sortieOrigin];
};

// Cookie domain for cross-subdomain session sharing between www.colist.fr and sortie.colist.fr.
// Intentionally undefined in development (localhost doesn't support cross-subdomain cookies cleanly).
const COOKIE_DOMAIN = process.env.NODE_ENV === "production" ? ".colist.fr" : undefined;

export const auth = betterAuth({
  // baseURL dynamique : Better Auth pioche le host depuis la requête
  // entrante et l'utilise comme origin pour cette session. Conséquence :
  // le redirect URI Google envoyé est `${origin}/api/auth/callback/google`
  // et varie selon où l'utilisateur a démarré (sortie ou www). Les deux
  // hosts sont configurés côté Google Console comme redirect URIs
  // autorisés, donc Google accepte les deux. Les liens magic link
  // partent aussi avec l'origin du browser (= sortie depuis sortie),
  // plus de problème de redirect cross-domain post-callback.
  baseURL: {
    allowedHosts: ["www.colist.fr", "sortie.colist.fr"],
    protocol: "https" as const,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: getTrustedOrigins(),
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: COOKIE_DOMAIN,
    },
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  },
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

      // Brand selon l'origin : si l'utilisateur a démarré le reset
      // depuis sortie.colist.fr, on lui sert un email Sortie (palette
      // acid cabinet, voix GenZ). Le `from:` reste hello@colist.fr —
      // 1 domaine vérifié Resend, partage du DKIM/SPF/DMARC.
      const sortieBranded = isSortieOrigin(url)
        ? buildSortieAuthEmail({ kind: "reset-password", ctaUrl: resetUrl })
        : null;

      const { error } = await resend.emails.send({
        from: "CoList <hello@colist.fr>",
        to: user.email,
        subject: sortieBranded?.subject ?? t("subject"),
        html:
          sortieBranded?.html ??
          `
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
    // Pas d'oAuthProxy : on a opté pour la solution multi-redirect-URI
    // côté Google Console (www + sortie tous les deux configurés).
    // Combiné avec `baseURL: { allowedHosts: [...] }`, Better Auth
    // utilise le host du request comme origin et envoie le bon redirect
    // URI à Google. Le flow est direct (1 hop, pas de proxy callback),
    // les cookies posés une seule fois sur `.colist.fr`.
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

        // Sortie utilise sa propre route `/login?token=...` (pas
        // localisée), Colist passe par `/<locale>/login?token=...`.
        const fromSortie = isSortieOrigin(url);
        const magicUrl = fromSortie
          ? `${origin}/login?token=${token}`
          : `${origin}/${locale}/login?token=${token}`;

        const sortieBranded = fromSortie
          ? buildSortieAuthEmail({ kind: "magic-link", ctaUrl: magicUrl })
          : null;

        const { error } = await resend.emails.send({
          from: "CoList <hello@colist.fr>",
          to: email,
          subject: sortieBranded?.subject ?? t("subject"),
          html:
            sortieBranded?.html ??
            `
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

      const sortieBranded = isSortieOrigin(url)
        ? buildSortieAuthEmail({ kind: "email-verification", ctaUrl: verifyUrl })
        : null;

      const { error } = await resend.emails.send({
        from: "CoList <hello@colist.fr>",
        to: user.email,
        subject: sortieBranded?.subject ?? t("subject"),
        html:
          sortieBranded?.html ??
          `
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
