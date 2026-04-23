import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inputSchema = z.object({
  url: z.string().url().max(2048),
});

// Hostnames we refuse to fetch. Not a full SSRF defence (a sophisticated
// attacker could point DNS at 127.0.0.1), but it catches the obvious probes
// and is cheap. Full defence would require DNS resolution + IP-range
// rejection — worth adding if/when this endpoint is abused.
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
  "metadata.google.internal",
]);

function isPrivateIpLikeHost(hostname: string): boolean {
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return true;
  }
  // Cheap numeric-prefix check for obvious private ranges. Real IP parsing
  // would belong in a helper, but we only need to stop casual probes.
  if (/^10\./.test(hostname)) {
    return true;
  }
  if (/^192\.168\./.test(hostname)) {
    return true;
  }
  if (/^169\.254\./.test(hostname)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
    return true;
  }
  return false;
}

const MAX_BYTES = 500 * 1024; // 500 KB — covers OG headers on any real page
const TIMEOUT_MS = 5000;

type Parsed = {
  title?: string;
  venue?: string;
  image?: string;
  // ISO start datetime, when we can pull it from schema.org/Event JSON-LD.
  // Lets the wizard pre-select date + time for the user.
  startsAt?: string;
};

// HTML entities commonly seen in ticket-site OG tags. Numeric (decimal +
// hex) are handled generically; named entities only cover the Western
// European accented set + typographic punctuation we actually run into
// ("NOAM &#8226; L&#039;Européen" was the user-reported case — bullet +
// apostrophe). Anything exotic falls through unchanged.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
  agrave: "à",
  aacute: "á",
  acirc: "â",
  auml: "ä",
  Agrave: "À",
  Aacute: "Á",
  Acirc: "Â",
  ccedil: "ç",
  Ccedil: "Ç",
  egrave: "è",
  eacute: "é",
  ecirc: "ê",
  euml: "ë",
  Egrave: "È",
  Eacute: "É",
  Ecirc: "Ê",
  igrave: "ì",
  iacute: "í",
  icirc: "î",
  iuml: "ï",
  ograve: "ò",
  oacute: "ó",
  ocirc: "ô",
  ouml: "ö",
  ugrave: "ù",
  uacute: "ú",
  ucirc: "û",
  uuml: "ü",
  Ugrave: "Ù",
  yuml: "ÿ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
  bull: "•",
  middot: "·",
  laquo: "«",
  raquo: "»",
};

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const code = parseInt(hex, 16);
      if (!Number.isFinite(code)) {
        return "";
      }
      try {
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = parseInt(dec, 10);
      if (!Number.isFinite(code)) {
        return "";
      }
      try {
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    })
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => NAMED_ENTITIES[name] ?? match);
}

// Tiny OG-meta extractor. Regex rather than a full HTML parser because we
// only care about a handful of `<meta>` tags at the top of the document —
// adding `cheerio` or `node-html-parser` just for this doubles the cold-
// start cost of the route.
// JSON-LD is the structured-data format Google-friendly ticket sites
// (leuropeen.paris, Fnac Spectacles, Opéra de Paris, Allociné, and any
// Schema.org-aware CMS) embed to describe their events. It gives us the
// venue name, start date and performer name directly — no regex heuristics
// on the marketing copy. We ignore malformed scripts rather than failing
// the whole request: any one valid event in the document wins.
type JsonLdHit = {
  title?: string;
  venue?: string;
  startsAt?: string;
};

function isEventType(raw: unknown): boolean {
  const types = Array.isArray(raw) ? raw : [raw];
  return types.some(
    (t) =>
      typeof t === "string" &&
      (t === "Event" || t === "Festival" || t.endsWith("Event") || t === "PerformingArtsTheater")
  );
}

function extractJsonLd(html: string): JsonLdHit | null {
  // Grab every JSON-LD script in the document (sites often ship multiple
  // — Organization, WebSite, Event — and we only care about the event).
  const scripts = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!scripts) {
    return null;
  }

  for (const tag of scripts) {
    const bodyMatch = tag.match(/>\s*([\s\S]*?)\s*<\/script>/);
    if (!bodyMatch) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyMatch[1]!);
    } catch {
      continue;
    }
    // Normalize to a flat list of candidates. Real-world JSON-LD is often
    // wrapped in `@graph` or is an array at the top level.
    const queue: unknown[] = [];
    const push = (item: unknown) => {
      if (Array.isArray(item)) {
        item.forEach(push);
        return;
      }
      if (item && typeof item === "object") {
        queue.push(item);
        const graph = (item as { "@graph"?: unknown })["@graph"];
        if (graph) {
          push(graph);
        }
      }
    };
    push(parsed);

    for (const candidate of queue) {
      if (!candidate || typeof candidate !== "object") {
        continue;
      }
      const obj = candidate as Record<string, unknown>;
      if (!isEventType(obj["@type"])) {
        continue;
      }
      const name = typeof obj.name === "string" ? obj.name.trim() : undefined;
      let venue: string | undefined;
      const location = obj.location;
      if (location && typeof location === "object") {
        const first = Array.isArray(location) ? location[0] : location;
        if (first && typeof first === "object") {
          const n = (first as { name?: unknown }).name;
          if (typeof n === "string") {
            venue = n.trim();
          }
        }
      } else if (typeof location === "string") {
        venue = location.trim();
      }
      const startDate = obj.startDate;
      const startsAt = typeof startDate === "string" ? startDate : undefined;
      return { title: name, venue, startsAt };
    }
  }
  return null;
}

const MONTHS_FR: Record<string, number> = {
  janvier: 0,
  fevrier: 1,
  février: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  août: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
  décembre: 11,
};

/**
 * Last-resort date extractor for pages that don't ship JSON-LD but bury
 * the info in the og:description ("Noam — le 26 juin à 19H30."). Best-
 * effort regex on the common French patterns; if nothing matches we
 * return undefined and the wizard falls back to the user picking it.
 * Infers the year: the event is assumed future, so a match whose
 * computed date is already past rolls to next year.
 */
function extractFrenchDate(text: string): string | undefined {
  const dm =
    /(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)(?:\s+(\d{4}))?\D+(\d{1,2})\s*[hH]\s*(\d{0,2})/u.exec(
      text
    );
  if (!dm) {
    return undefined;
  }
  const day = parseInt(dm[1]!, 10);
  const monthName = dm[2]!.toLowerCase();
  const monthIdx = MONTHS_FR[monthName];
  if (monthIdx === undefined) {
    return undefined;
  }
  const hour = parseInt(dm[4]!, 10);
  const minute = dm[5] && dm[5].length > 0 ? parseInt(dm[5], 10) : 0;
  const now = new Date();
  const explicitYear = dm[3] ? parseInt(dm[3], 10) : undefined;
  let year = explicitYear ?? now.getFullYear();
  // Roll forward if the computed date is already past — events are
  // always in the future from the creator's standpoint.
  const candidate = new Date(year, monthIdx, day, hour, minute);
  if (!explicitYear && candidate.getTime() < now.getTime()) {
    year += 1;
  }
  // Return a local-ISO string (no Z) so the client parses it as a local
  // time in its own timezone. A plain `.toISOString()` (UTC) would turn
  // "19h30 Paris" into 17:30Z which then renders back in Paris as… 19h30
  // again most of the time, but only because of the reverse offset. The
  // local-ISO form is unambiguous for our use case (the creator typed a
  // time and it should appear unchanged).
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(monthIdx + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;
}

/**
 * Detects "title · venue" / "title — venue" suffix patterns and splits
 * them — L'Européen ships `og:title = "NOAM · L'Européen"` and
 * `og:site_name = "L'Européen"`, so whenever the site_name tails the
 * title we trust it as the venue and strip it out of the displayed
 * title to avoid `NOAM · L'Européen / L'Européen` duplication.
 */
function splitTitleAndVenue(
  title: string,
  siteName: string | undefined
): {
  title: string;
  venue: string | undefined;
} {
  if (!siteName) {
    return { title, venue: undefined };
  }
  const normSite = siteName.trim();
  if (!normSite) {
    return { title, venue: undefined };
  }
  // Common separator characters across French ticket sites.
  const separators = ["·", "•", "—", "–", "-", "|", "@"];
  for (const sep of separators) {
    const suffix = ` ${sep} ${normSite}`;
    if (title.endsWith(suffix)) {
      return { title: title.slice(0, -suffix.length).trim(), venue: normSite };
    }
  }
  // Also handle glued variants ("NOAM·L'Européen").
  for (const sep of separators) {
    const suffix = `${sep} ${normSite}`;
    if (title.endsWith(suffix)) {
      return { title: title.slice(0, -suffix.length).trim(), venue: normSite };
    }
  }
  return { title, venue: undefined };
}

function extractOg(html: string): Parsed {
  const get = (prop: string): string | undefined => {
    // `property` is the OG canonical attribute, but many sites use `name` —
    // match either. Non-greedy, case-insensitive, quotes optional around
    // the value (Fnac ships unquoted sometimes).
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']?${prop}["']?[^>]+content=["']([^"']+)["']`,
      "i"
    );
    const m = html.match(re);
    if (m) {
      return decodeHtmlEntities(m[1]!.trim());
    }
    // Try the other attribute order too — content first, then property.
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']?${prop}["']?`,
      "i"
    );
    const m2 = html.match(re2);
    return m2 ? decodeHtmlEntities(m2[1]!.trim()) : undefined;
  };

  const ogTitle = get("og:title") ?? get("twitter:title");
  const description = get("og:description") ?? get("twitter:description");
  const image = get("og:image") ?? get("twitter:image");
  const siteName = get("og:site_name");

  // Structured data first — it's canonical when present. Name wins over
  // og:title only if the latter duplicates the venue as a suffix.
  const jsonLd = extractJsonLd(html);
  let title = ogTitle;
  if (jsonLd?.title) {
    if (!title || (jsonLd.venue && title.includes(jsonLd.venue))) {
      title = decodeHtmlEntities(jsonLd.title);
    }
  }

  // Venue priority:
  //   1. JSON-LD location.name (canonical)
  //   2. og:site_name when it suffixes the og:title (L'Européen case)
  //   3. First short sentence of og:description (legacy heuristic)
  let venue = jsonLd?.venue ? decodeHtmlEntities(jsonLd.venue) : undefined;
  if (!venue && title && siteName) {
    const split = splitTitleAndVenue(title, siteName);
    if (split.venue) {
      venue = split.venue;
      title = split.title;
    }
  }
  if (!venue && description && description.length <= 200) {
    venue = description.split(/[.\n]/)[0]?.trim();
  }

  // Start date priority: JSON-LD > natural-language parse of description.
  let startsAt = jsonLd?.startsAt;
  if (!startsAt && description) {
    startsAt = extractFrenchDate(description);
  }

  return { title, venue, image, startsAt };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(parsed.data.url);
  } catch {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ error: "unsupported_protocol" }, { status: 400 });
  }
  if (isPrivateIpLikeHost(target.hostname)) {
    return NextResponse.json({ error: "blocked_host" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Some sites gate OG tags behind a real-looking UA. We ship one so
        // the metadata layer renders for us, but we don't pretend to be a
        // specific browser version.
        "User-Agent": "SortieBot/1.0 (+https://sortie.colist.fr)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json({ error: "not_html" }, { status: 400 });
    }

    // Read at most MAX_BYTES so a giant HTML blob can't exhaust memory.
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "empty_body" }, { status: 400 });
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
      total += value.byteLength;
    }
    reader.cancel().catch(() => {});

    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      Buffer.concat(chunks.map((c) => Buffer.from(c)))
    );
    const og = extractOg(html);

    return NextResponse.json({
      title: og.title ?? null,
      venue: og.venue ?? null,
      image: og.image ?? null,
      startsAt: og.startsAt ?? null,
      ticketUrl: target.toString(),
    });
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: "fetch_failed", detail: message.slice(0, 120) },
      { status: 502 }
    );
  }
}
