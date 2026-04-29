import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

// Anti-SSRF helper. Centralisé parce que deux endpoints (parse-ticket-url
// et generateOgThumbnailFromRemoteUrl) acceptent des URLs choisies par
// l'utilisateur et tapent dessus côté serveur. Sans DNS resolve + IP
// check, un attaquant pointe un domaine qu'il contrôle vers 127.0.0.1
// ou 169.254.169.254 (AWS metadata) et bypass un filtre hostname-only.

const PRIVATE_V4_PATTERNS = [
  /^10\./,
  /^192\.168\./,
  /^169\.254\./, // link-local + AWS metadata
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^127\./, // loopback
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
];

function isPrivateV4(ip: string): boolean {
  return PRIVATE_V4_PATTERNS.some((re) => re.test(ip));
}

function isPrivateV6(ip: string): boolean {
  const lc = ip.toLowerCase();
  if (lc === "::1" || lc === "::") {
    return true;
  }
  // ULA fc00::/7, link-local fe80::/10, multicast ff00::/8
  if (lc.startsWith("fc") || lc.startsWith("fd") || lc.startsWith("fe80:") || lc.startsWith("ff")) {
    return true;
  }
  // IPv4-mapped IPv6 ::ffff:a.b.c.d
  const v4Mapped = lc.match(/^::ffff:([0-9.]+)$/);
  if (v4Mapped) {
    return isPrivateV4(v4Mapped[1]!);
  }
  return false;
}

function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) {
    return isPrivateV4(ip);
  }
  if (family === 6) {
    return isPrivateV6(ip);
  }
  return true; // pas une IP : refuser par défaut
}

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata"]);

/**
 * Check synchrone : le hostname est-il *manifestement* privé/loopback
 * sans nécessiter de DNS ? Utilisé pour court-circuiter les routes
 * publiques avec un 400 propre quand l'utilisateur passe une IP littérale
 * privée. Ne couvre PAS le DNS rebinding (un domaine qui résout vers
 * 127.0.0.1) — pour ça il faut safeFetchExternal qui résout au moment
 * du fetch.
 */
export function isLikelyPrivateHostname(hostname: string): boolean {
  const lc = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lc)) {
    return true;
  }
  const family = isIP(hostname);
  if (family === 4) {
    return isPrivateV4(hostname);
  }
  if (family === 6) {
    return isPrivateV6(hostname);
  }
  return false;
}

async function resolveHostnameOrThrow(hostname: string): Promise<void> {
  const lc = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lc)) {
    throw new Error("blocked_host");
  }
  // Si le hostname est déjà une IP littérale on saute le DNS.
  const literalFamily = isIP(hostname);
  if (literalFamily !== 0) {
    if (isPrivateIp(hostname)) {
      throw new Error("blocked_host");
    }
    return;
  }
  const { address } = await dnsLookup(hostname);
  if (isPrivateIp(address)) {
    throw new Error("blocked_host");
  }
}

export type SafeFetchOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
  /** Substring match against the response Content-Type. Empty/undefined disables the check. */
  acceptContentTypes?: string[];
};

export type SafeFetchResult =
  | { ok: true; status: number; headers: Headers; body: Buffer }
  | {
      ok: false;
      reason:
        | "blocked_host"
        | "timeout"
        | "too_large"
        | "wrong_content_type"
        | "http_error"
        | "network_error";
      status?: number;
    };

/**
 * Fetch une URL externe avec protections SSRF :
 *   - DNS resolve + check IP privée/loopback/link-local (IPv4 + IPv6)
 *   - redirect: "manual" + ré-validation à chaque hop
 *   - timeout dur via AbortSignal
 *   - lecture chunkée plafonnée (maxBytes)
 *   - filtre Content-Type optionnel
 */
export async function safeFetchExternal(
  rawUrl: string,
  opts: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const {
    signal,
    timeoutMs = 5000,
    maxBytes = 500 * 1024,
    maxRedirects = 3,
    headers = {},
    acceptContentTypes,
  } = opts;

  let initial: URL;
  try {
    initial = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "blocked_host" };
  }
  if (initial.protocol !== "https:" && initial.protocol !== "http:") {
    return { ok: false, reason: "blocked_host" };
  }

  const controller = new AbortController();
  const onUpstreamAbort = () => controller.abort();
  signal?.addEventListener("abort", onUpstreamAbort);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let currentUrl = initial;
  let hops = 0;

  try {
    for (;;) {
      try {
        await resolveHostnameOrThrow(currentUrl.hostname);
      } catch {
        return { ok: false, reason: "blocked_host" };
      }

      const response = await fetch(currentUrl.toString(), {
        signal: controller.signal,
        redirect: "manual",
        headers,
      });

      if (response.status >= 300 && response.status < 400 && response.headers.has("location")) {
        const loc = response.headers.get("location")!;
        let next: URL;
        try {
          next = new URL(loc, currentUrl);
        } catch {
          return { ok: false, reason: "blocked_host" };
        }
        if (next.protocol !== "https:" && next.protocol !== "http:") {
          return { ok: false, reason: "blocked_host" };
        }
        hops += 1;
        if (hops > maxRedirects) {
          return { ok: false, reason: "http_error", status: response.status };
        }
        currentUrl = next;
        continue;
      }

      if (!response.ok) {
        return { ok: false, reason: "http_error", status: response.status };
      }

      if (acceptContentTypes && acceptContentTypes.length > 0) {
        const ct = response.headers.get("content-type") ?? "";
        if (!acceptContentTypes.some((accepted) => ct.includes(accepted))) {
          return { ok: false, reason: "wrong_content_type", status: response.status };
        }
      }

      const declaredLen = response.headers.get("content-length");
      if (declaredLen) {
        const n = Number(declaredLen);
        if (Number.isFinite(n) && n > maxBytes) {
          return { ok: false, reason: "too_large", status: response.status };
        }
      }

      const reader = response.body?.getReader();
      if (!reader) {
        return {
          ok: true,
          status: response.status,
          headers: response.headers,
          body: Buffer.alloc(0),
        };
      }
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        total += value.byteLength;
        if (total > maxBytes) {
          void reader.cancel().catch(() => {});
          return { ok: false, reason: "too_large", status: response.status };
        }
        chunks.push(value);
      }

      const body = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      return { ok: true, status: response.status, headers: response.headers, body };
    }
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "network_error" };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onUpstreamAbort);
  }
}
