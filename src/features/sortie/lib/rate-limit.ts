import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/redis";

/**
 * Read the client IP from the forwarded headers Vercel sets. Falls back to
 * "unknown" so a missing header doesn't let an attacker bypass the limiter.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0]!.trim();
  }
  return h.get("x-real-ip") ?? "unknown";
}

type Result = { ok: true } | { ok: false; message: string };

export async function rateLimit(args: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<Result> {
  const { key, limit, windowSeconds } = args;
  const outcome = await checkRateLimit(`sortie:${key}`, limit, windowSeconds);
  if (outcome.success) {
    return { ok: true };
  }
  const minutes = Math.ceil(outcome.retryAfter / 60);
  return {
    ok: false,
    message:
      minutes <= 1
        ? "Trop de tentatives — réessaie dans une minute."
        : `Trop de tentatives — réessaie dans ${minutes} minutes.`,
  };
}
