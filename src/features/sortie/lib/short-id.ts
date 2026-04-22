import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { outings } from "@drizzle/sortie-schema";

/**
 * Public identifier for a sortie, used in URLs like sortie.colist.fr/<shortId>.
 * Uses an alphabet that excludes visually ambiguous characters (0/O, 1/I/l)
 * so users can read one off a screen or dictate it on the phone.
 *
 * 54 symbols × 8 chars ≈ 72 trillion combinations. At 1000 req/s, brute-force
 * takes ~2300 years. The 6-char variant proposed in the functional spec would
 * fall in roughly a year, so we lifted it to 8 on security review.
 */

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const LENGTH = 8;

export function generateShortId(): string {
  const bytes = randomBytes(LENGTH);
  let out = "";
  for (let i = 0; i < LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/**
 * Generates a short_id and checks it against the outings table. Retries on the
 * (astronomically unlikely) collision. Throws after `maxRetries` consecutive
 * collisions — the caller should treat that as a fatal error, not a race.
 */
export async function generateUniqueShortId(maxRetries = 5): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const candidate = generateShortId();
    const [existing] = await db
      .select({ id: outings.id })
      .from(outings)
      .where(eq(outings.shortId, candidate))
      .limit(1);
    if (!existing) {
      return candidate;
    }
  }
  throw new Error("[sortie] short_id generation exhausted retries");
}

/**
 * Produces an ASCII slug from an arbitrary title. Used only for SEO-friendly
 * URL prefixes (/<slug>-<shortId>) — the short_id remains the canonical
 * identifier, so slug collisions are fine.
 */
export function slugifyAscii(input: string, maxLen = 50): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/g, ""); // trim trailing dash left by the slice
}
