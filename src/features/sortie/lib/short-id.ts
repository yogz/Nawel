import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { outings } from "@drizzle/sortie-schema";

/**
 * 8 chars × 54-symbol alphabet ≈ 7×10¹³ combinations — resistant to brute-force
 * scanning at any realistic rate. The 6-char spec would fall in months.
 */

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const LENGTH = 8;
// Rejection-sampling threshold: 256 - (256 % 54) = 216. Bytes ≥ 216 are
// rerolled so every symbol is equally likely (54 × 4 = 216 < 256, so without
// this some symbols would be 25 % more probable than others).
const MAX_FAIR_BYTE = 256 - (256 % ALPHABET.length);

export function generateShortId(): string {
  let out = "";
  while (out.length < LENGTH) {
    const buf = randomBytes(LENGTH * 2);
    for (const byte of buf) {
      if (byte >= MAX_FAIR_BYTE) {
        continue;
      }
      out += ALPHABET[byte % ALPHABET.length];
      if (out.length === LENGTH) {
        break;
      }
    }
  }
  return out;
}

/**
 * Caller must also handle a unique-constraint violation from the INSERT it
 * performs afterwards — this check-then-insert is not atomic.
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

export function slugifyAscii(input: string, maxLen = 50): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/g, "");
}
