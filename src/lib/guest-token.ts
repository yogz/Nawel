/**
 * Guest token storage with expiration.
 *
 * Client-side expiration is a safety net: the server is the authoritative check
 * (tokens validated via validateWriteKeyAction). Expired entries are purged
 * lazily on read so stale localStorage doesn't accumulate.
 *
 * Format v2 (current): JSON `{ t: string; e: number }` where `e` is expiresAt ms.
 * Format v1 (legacy):   plain string token — treated as valid, no expiration.
 */

const DEFAULT_TTL_DAYS = 180;
const LEGACY_GLOBAL_KEY = "colist_guest_tokens";

interface StoredToken {
  t: string;
  e: number;
}

function eventKey(slug: string) {
  return `event_token_${slug}`;
}

function parseStored(raw: string | null): StoredToken | string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "t" in parsed && "e" in parsed) {
      return parsed as StoredToken;
    }
  } catch {
    // Not JSON — legacy plain-string token
    return raw;
  }
  return null;
}

function isExpired(stored: StoredToken | string): stored is StoredToken & never {
  if (typeof stored === "string") return false;
  return Date.now() > stored.e;
}

export function setGuestToken(slug: string, token: string, ttlDays: number = DEFAULT_TTL_DAYS) {
  if (typeof window === "undefined") return;
  try {
    const expiresAt = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
    const payload: StoredToken = { t: token, e: expiresAt };
    localStorage.setItem(eventKey(slug), JSON.stringify(payload));
  } catch {
    // Quota exceeded or disabled — ignore
  }
}

export function getGuestToken(slug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = parseStored(localStorage.getItem(eventKey(slug)));
    if (!stored) return null;

    if (typeof stored === "string") {
      return stored;
    }

    if (isExpired(stored)) {
      localStorage.removeItem(eventKey(slug));
      return null;
    }

    return stored.t;
  } catch {
    return null;
  }
}

export function clearGuestToken(slug: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(eventKey(slug));
  } catch {
    // ignore
  }
}

export function setLegacyPersonToken(
  personId: number,
  token: string,
  ttlDays: number = DEFAULT_TTL_DAYS
) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LEGACY_GLOBAL_KEY);
    const map: Record<string, StoredToken> = raw ? JSON.parse(raw) : {};
    map[String(personId)] = {
      t: token,
      e: Date.now() + ttlDays * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(LEGACY_GLOBAL_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getLegacyPersonTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LEGACY_GLOBAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const valid: Record<string, string> = {};
    let changed = false;
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        // Legacy plain-string
        valid[id] = value;
        continue;
      }
      if (value && typeof value === "object" && "t" in value && "e" in value) {
        const stored = value as StoredToken;
        if (Date.now() <= stored.e) {
          valid[id] = stored.t;
        } else {
          changed = true;
        }
      }
    }

    if (changed) {
      localStorage.setItem(
        LEGACY_GLOBAL_KEY,
        JSON.stringify(Object.fromEntries(Object.entries(parsed).filter(([id]) => id in valid)))
      );
    }

    return valid;
  } catch {
    return {};
  }
}
