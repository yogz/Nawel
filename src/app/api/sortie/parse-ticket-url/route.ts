import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { searchTicketmasterEvents } from "@/features/sortie/lib/ticketmaster-search";
import { trackParseAttempt, type ParseOutcome } from "@/features/sortie/lib/parse-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inputSchema = z.object({
  // Accept any string up to 4 KB — we extract the first http(s) URL
  // server-side so the client can paste a whole WhatsApp snippet and
  // still get a usable parse. Validated as URL AFTER extraction.
  url: z.string().min(1).max(4096),
});

function extractFirstUrl(raw: string): string | null {
  const match = raw.match(/https?:\/\/[^\s<>()[\]{}"'`]+/i);
  if (!match) {
    return null;
  }
  let url = match[0];
  while (url.length > 0 && /[.,;!?:)\]}>"'`]$/.test(url)) {
    url = url.slice(0, -1);
  }
  return url || null;
}

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

// Hosts known to ship an empty HTML shell with client-side rendering
// only — Googlebot itself gets nothing back. Quand l'extraction ne
// remonte rien ET que le host est listé ici, on construit un hint
// dédié pour que l'utilisateur sache qu'il s'agit d'un site rendu en
// JS (pas un bug de notre côté) et qu'on lui suggère une alternative
// qui marche mieux côté scraping.
const SPA_HOSTS: Record<string, { name: string; alternate: string }> = {
  "pathe.fr": { name: "Pathé", alternate: "Allociné" },
  "ugc.fr": { name: "UGC", alternate: "Allociné" },
};

// Hosts protégés par un WAF anti-bot (DataDome ou équivalent) qui
// répondent INTERNAL_ERROR / timeout à toute requête sans empreinte
// navigateur complète. Tous appartiennent au groupe CTS Eventim
// (propriétaire de France Billet, Fnac Spectacles, Carrefour Billetterie,
// Ticketnet) qui partage la même infra protectrice.
//
// Stratégie : on ne fetch même pas — on économise 5 s de timeout, et
// on saute directement au slug parser + Discovery API (Ticketmaster.fr
// partage souvent le même catalogue car CTS Eventim possède aussi
// Ticketmaster en Europe).
const CTS_EVENTIM_HOSTS = new Set([
  "fnacspectacles.com",
  "fnacspectacles.fr",
  "francebillet.com",
  "carrefour-spectacles.com",
  "ticketnet.fr",
]);

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function isCtsEventimHost(hostname: string): boolean {
  return CTS_EVENTIM_HOSTS.has(normalizeHostname(hostname));
}

const CTS_EVENTIM_LABELS: Record<string, string> = {
  "fnacspectacles.com": "Fnac Spectacles",
  "fnacspectacles.fr": "Fnac Spectacles",
  "francebillet.com": "France Billet",
  "carrefour-spectacles.com": "Carrefour Spectacles",
  "ticketnet.fr": "Ticketnet",
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

// Venue keywords — if a string contains any of these, it's almost
// certainly a place name. Used to gate two fallbacks that would
// otherwise be too aggressive: promoting `og:site_name` straight to
// venue (Opéra national de Paris case), and pulling the first sentence
// of `og:description` (Antonia Bembo composer-name-as-venue bug). All
// lowercased; comparison is case-insensitive.
const VENUE_KEYWORDS = [
  "opéra",
  "opera",
  "théâtre",
  "theatre",
  "salle",
  "auditorium",
  "philharmonie",
  "palais",
  "comédie",
  "comedie",
  "scène",
  "scene",
  "amphithéâtre",
  "arène",
  "arene",
  "cirque",
  "maison",
  "conservatoire",
  "centre",
  "cité",
  "cite",
  "musée",
  "musee",
  "bastille",
  "zénith",
  "zenith",
  "parc",
  "stade",
  "arena",
  "hall",
  "club",
  "bataclan",
  // Common French concert/show venue nouns that aren't generic enough
  // to qualify as "keywords" but reliably mark a venue when they
  // appear in URL slugs or og:site_name. Case-insensitive — the slug
  // splitter pairs them with a leading article ("le-grand-rex",
  // "l-olympia") to keep title/venue detection from leaking.
  "rex",
  "olympia",
  "cigale",
  "trianon",
  "bobino",
  "alhambra",
  "casino",
];

function looksLikeVenue(s: string | undefined): boolean {
  if (!s) {
    return false;
  }
  const lower = s.toLowerCase();
  return VENUE_KEYWORDS.some((k) => lower.includes(k));
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

  // Venue priority (post-2024 revision to stop composer names leaking
  // in through the description fallback):
  //   1. JSON-LD location.name (canonical)
  //   2. og:site_name when it *looks like a venue* (contains "opéra",
  //      "théâtre", etc. — Opéra national de Paris case)
  //   3. og:site_name when it suffixes the og:title (L'Européen case —
  //      "NOAM · L'Européen" → strip from title + venue)
  //   4. First short sentence of og:description, ONLY when that sentence
  //      itself looks like a venue. Without this guard we leaked
  //      "Antonia Bembo" (a composer) onto the Opera page.
  let venue = jsonLd?.venue ? decodeHtmlEntities(jsonLd.venue) : undefined;
  if (!venue && looksLikeVenue(siteName)) {
    venue = siteName;
  }
  if (!venue && title && siteName) {
    const split = splitTitleAndVenue(title, siteName);
    if (split.venue) {
      venue = split.venue;
      title = split.title;
    }
  }
  if (!venue && description && description.length <= 200) {
    const firstSentence = description.split(/[.\n]/)[0]?.trim();
    if (firstSentence && looksLikeVenue(firstSentence)) {
      venue = firstSentence;
    }
  }

  // Start date priority: JSON-LD > natural-language parse of description.
  let startsAt = jsonLd?.startsAt;
  if (!startsAt && description) {
    startsAt = extractFrenchDate(description);
  }

  return { title, venue, image, startsAt };
}

/**
 * Title-cased, space-separated form of a URL slug:
 *   "george-dalaras-rembetiko" → "George Dalaras Rembetiko"
 * Used as the last-resort title when the page itself yielded nothing.
 */
function humanizeSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/**
 * When a slug ends with "-le-grand-rex", "-le-bataclan", "-l-olympia"
 * etc. — a French article followed by a venue noun — split it into
 * title / venue. Falls back to "whole slug as title" when no venue
 * marker is found (better than nothing — the user can still edit).
 *
 * Detection: the LAST occurrence of `-(le|la|les|l)-` whose suffix
 * contains a `VENUE_KEYWORDS` term wins. We scan from the end because
 * titles can themselves contain "le"/"la" ("la-belle-et-la-bete-…")
 * and we want the venue split, not the article inside the title.
 */
function splitTitleVenueFromSlug(slug: string): { title?: string; venue?: string } {
  // "au" / "aux" are locative articles: "macbeth-au-theatre-…",
  // "spectacle-aux-bouffes-…". Treated as venue markers alongside the
  // definite articles.
  const articles = ["le", "la", "les", "l", "au", "aux"];
  let bestSplit: { idx: number; venueText: string } | null = null;
  for (const article of articles) {
    const marker = `-${article}-`;
    const idx = slug.lastIndexOf(marker);
    if (idx <= 0) {
      continue;
    }
    const suffix = slug.slice(idx + 1);
    const suffixSpaced = suffix.replace(/[-_]+/g, " ").toLowerCase();
    if (!VENUE_KEYWORDS.some((k) => suffixSpaced.includes(k))) {
      continue;
    }
    if (!bestSplit || idx > bestSplit.idx) {
      bestSplit = { idx, venueText: suffix };
    }
  }
  if (bestSplit) {
    const titlePart = slug.slice(0, bestSplit.idx);
    const titleHumanized = humanizeSlug(titlePart);
    if (titleHumanized.length > 0) {
      return { title: titleHumanized, venue: humanizeSlug(bestSplit.venueText) };
    }
  }
  const whole = humanizeSlug(slug);
  return whole.length > 0 ? { title: whole } : {};
}

/**
 * Last-resort extractor when the page itself yields nothing useful
 * (anti-bot challenge, JS-rendered shell, 4xx, etc.). Mines the URL
 * path for an artist/venue slug. Loose on purpose: garbage slugs
 * (numeric IDs only, empty paths) return {} and the wizard falls back
 * to "rien trouvé".
 */
function extractFromUrlSlug(url: URL): { title?: string; venue?: string } {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  // Ticketmaster.fr: /fr/manifestation/<slug>/idmanif/<id>
  // Slugs end with "-billet" / "-billets" / "-tickets" — strip those
  // before humanizing so we don't ship "George Dalaras Billet" as
  // a title.
  if (host === "ticketmaster.fr") {
    const idx = segments.indexOf("manifestation");
    const slug = idx >= 0 ? segments[idx + 1] : undefined;
    if (!slug || !/[a-z]/i.test(slug)) {
      return {};
    }
    const cleaned = slug.replace(/-(billet|billets|tickets|reservation|reservations)$/i, "");
    const title = humanizeSlug(cleaned);
    return title.length > 0 ? { title } : {};
  }

  // Fnac Spectacles + autres sites du groupe CTS Eventim : la URL
  // suit toujours le pattern /<segment>/<slug>-<id>/ avec <segment>
  // qui varie par site (event, place-de-spectacle, place, manifestation,
  // ticket…). On itère sur les segments connus et on prend le suivant.
  if (
    host === "fnacspectacles.com" ||
    host === "fnacspectacles.fr" ||
    host === "francebillet.com" ||
    host === "carrefour-spectacles.com" ||
    host === "ticketnet.fr"
  ) {
    const knownSegments = new Set([
      "event",
      "place-de-spectacle",
      "place",
      "manifestation",
      "ticket",
      "billet",
    ]);
    const segIdx = segments.findIndex((s) => knownSegments.has(s));
    const slug = segIdx >= 0 ? segments[segIdx + 1] : segments[segments.length - 1];
    if (!slug || !/[a-z]/i.test(slug)) {
      return {};
    }
    const cleaned = slug
      .replace(/-\d{4,}$/, "")
      .replace(/-(billet|billets|tickets|reservation|reservations)$/i, "");
    return splitTitleVenueFromSlug(cleaned);
  }

  // Generic: last meaningful path segment. Strip trailing numeric ids
  // and `.html?` suffixes — most CMSes ship one or the other.
  const last = segments[segments.length - 1] ?? "";
  const cleaned = last.replace(/-\d{4,}$/, "").replace(/\.html?$/i, "");
  if (!cleaned || !/[a-z]/i.test(cleaned)) {
    return {};
  }
  return splitTitleVenueFromSlug(cleaned);
}

/**
 * Pull the artist/show name out of a ticketmaster.fr slug for
 * Discovery API lookup. Strips the "-billet" / "-billets" / "-tickets"
 * suffix and replaces dashes with spaces. Returns null when the slug
 * has no usable token (numeric only, empty path).
 */
function ticketmasterSearchKeyword(url: URL): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  const idx = segments.indexOf("manifestation");
  const slug = idx >= 0 ? segments[idx + 1] : undefined;
  if (!slug || !/[a-z]/i.test(slug)) {
    return null;
  }
  const cleaned = slug
    .replace(/-(billet|billets|tickets|reservation|reservations)$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return cleaned.length >= 3 ? cleaned : null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Pull the first http(s) URL from the input — the client already does
  // this for UX echo, but we repeat it here so the API is safe to call
  // with messy input directly.
  const extracted = extractFirstUrl(parsed.data.url);
  if (!extracted) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }
  let target: URL;
  try {
    target = new URL(extracted);
  } catch {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ error: "unsupported_protocol" }, { status: 400 });
  }
  if (isPrivateIpLikeHost(target.hostname)) {
    trackParseAttempt(target.hostname, "fetch_error", target.pathname);
    return NextResponse.json({ error: "blocked_host" }, { status: 400 });
  }

  // Always run the slug fallback up-front. It's cheap, deterministic,
  // and gives us a safety net if the upcoming fetch returns an anti-bot
  // challenge (Datadome on ticketmaster.fr / fnacspectacles.com), a
  // 403, a JS-only shell, or anything else with no usable OG/JSON-LD.
  const slug = extractFromUrlSlug(target);

  // Détection précoce des hosts CTS Eventim : on sait que le fetch va
  // échouer (WAF), donc on skip directement pour économiser 5 s de
  // timeout et éviter de polluer parse_stats avec un fetch_error qui
  // n'est pas un bug à fixer.
  const wafBlocked = isCtsEventimHost(target.hostname);
  const fetchResult = wafBlocked
    ? { data: {} as Parsed, fetched: false }
    : await fetchAndParseOg(target);
  const og: Parsed = fetchResult.data;

  // Discovery API enrichment :
  //   - Pour ticketmaster.fr : on extrait le keyword du slug et on
  //     query Discovery — gives us image + date + venue sans toucher
  //     la page (qui peut être WAF-protégée).
  //   - Pour les hosts CTS Eventim (Fnac Spectacles, France Billet…) :
  //     même logique, mais le keyword vient du slug humanisé. CTS
  //     Eventim possède aussi Ticketmaster en Europe → fort taux de
  //     mirroring du catalogue.
  //   - Best-effort dans tous les cas : empty result OK.
  let tm: { title?: string; venue?: string; image?: string; startsAt?: string } = {};
  const normHost = normalizeHostname(target.hostname);
  let discoveryKeyword: string | null = null;
  if (normHost === "ticketmaster.fr") {
    discoveryKeyword = ticketmasterSearchKeyword(target);
  } else if (isCtsEventimHost(target.hostname) && slug.title) {
    discoveryKeyword = slug.title;
  }
  if (discoveryKeyword) {
    const events = await searchTicketmasterEvents(discoveryKeyword, 1, "parse-enrich");
    const top = events[0];
    if (top) {
      tm = {
        title: top.title ?? undefined,
        venue: [top.venue, top.city].filter(Boolean).join(", ") || undefined,
        image: top.image ?? undefined,
        startsAt: top.startsAt ?? undefined,
      };
    }
  }

  // Merge priority: page-extracted (canonical when available) > TM API
  // enrichment > URL-slug. The slug is always last because it's the
  // crudest signal — the page or API will be more accurate when they
  // ship something usable.
  const title = og.title || tm.title || slug.title;
  const venue = og.venue || tm.venue || slug.venue;
  const image = og.image || tm.image;
  const startsAt = og.startsAt || tm.startsAt;

  // Hint user-facing unifié pour les deux cas où le scraping ne peut
  // rien remonter de la page (par design, pas par bug) :
  //   - "waf" : site anti-bot (groupe CTS Eventim — Fnac Spectacles…)
  //   - "spa" : site rendu côté client (Pathé, UGC…)
  // Dans les deux cas on dit ce qui se passe + une alternative
  // concrète pour la prochaine fois. Affiché toujours pour les WAF
  // (le hint vaut même si Discovery a enrichi), affiché pour les SPA
  // uniquement quand on n'a vraiment rien remonté (le slug fallback
  // marche souvent).
  const nothingUseful = !title && !venue && !image && !startsAt;
  const spa = SPA_HOSTS[normHost] ?? null;
  let parserHint: { kind: "waf" | "spa"; siteName: string; suggestion: string } | null = null;
  if (wafBlocked) {
    parserHint = {
      kind: "waf",
      siteName: CTS_EVENTIM_LABELS[normHost] ?? "Ce site",
      suggestion:
        "Pour de meilleurs résultats, colle plutôt un lien Ticketmaster ou le site de la salle directement.",
    };
  } else if (nothingUseful && spa) {
    parserHint = {
      kind: "spa",
      siteName: spa.name,
      suggestion: `Essaie plutôt un lien ${spa.alternate} pour le même événement.`,
    };
  }

  // Telemetry par hostname. On ne juge que ce que la PAGE a donné
  // (og + JSON-LD), pas les fallbacks slug / Discovery API : c'est
  // bien le scraper qu'on veut surveiller. Différé après la réponse.
  // Pour les hosts CTS Eventim on marque "blocked_waf" plutôt que
  // "fetch_error" — c'est un blocage par design, pas un bug à fixer,
  // on isole le faux positif dans la table.
  const pageGotSomething = Boolean(og.title || og.venue || og.image || og.startsAt);
  const outcome: ParseOutcome = wafBlocked
    ? "blocked_waf"
    : !fetchResult.fetched
      ? "fetch_error"
      : pageGotSomething
        ? "success"
        : "zero_data";
  // imageFound = strictement ce que la PAGE a donné (cohérent avec le
  // reste de la télémétrie) — on n'attribue pas l'image enrichie via
  // Discovery API au scraper OG.
  trackParseAttempt(target.hostname, outcome, target.pathname, Boolean(og.image));

  return NextResponse.json({
    title: title ?? null,
    venue: venue ?? null,
    image: image ?? null,
    startsAt: startsAt ?? null,
    ticketUrl: target.toString(),
    parserHint,
  });
}

/**
 * Fetch the target URL with a realistic mobile UA and pull OG /
 * JSON-LD metadata out of the response. Returns an empty `Parsed` for
 * any failure mode (timeout, non-HTML response, 4xx/5xx, anti-bot
 * challenge with no structured data) — the caller falls back to slug
 * extraction or API enrichment.
 *
 * Previously this was the entire POST body; broken out so the handler
 * can layer slug + Discovery API enrichment on top of whatever the
 * page gives us, instead of bailing out the moment fetch hiccups.
 */
type FetchResult = { data: Parsed; fetched: boolean };

async function fetchAndParseOg(target: URL): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Most French ticket sites (billetterie.chatelet.com, Fnac, etc.)
        // gate their OG / JSON-LD output behind a realistic mobile
        // browser UA. Our previous `SortieBot/1.0` identifier was
        // greeted with a "Cookies appear to be disabled" stub page. A
        // current-ish iOS Safari string is the sweet spot: we look like
        // a real viewer (the whole premise of Sortie is mobile users
        // sharing links), and ticket sites ship their full HTML.
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timeout);

    // Non-2xx ou redirection vers une 4xx/5xx résolue : on considère
    // que c'est un fetch_error pour la télémétrie. La page ne nous a
    // littéralement rien donné d'exploitable.
    if (!response.ok) {
      return { data: {}, fetched: false };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return { data: {}, fetched: false };
    }

    // Read at most MAX_BYTES so a giant HTML blob can't exhaust memory.
    const reader = response.body?.getReader();
    if (!reader) {
      return { data: {}, fetched: false };
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
    return { data: extractOg(html), fetched: true };
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : "unknown";
    console.warn("[parse-ticket-url] fetch failed:", message.slice(0, 120));
    return { data: {}, fetched: false };
  }
}
