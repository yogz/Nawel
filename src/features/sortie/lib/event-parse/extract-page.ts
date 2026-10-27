/**
 * Extraction pure d'une page de spectacle (HTML → données brutes) :
 * balises Open Graph, JSON-LD schema.org/Event, dates FR en texte.
 * Aucun I/O — sortie de la route `parse-ticket-url` pour être testable
 * et réutilisable par le benchmark (`scripts/sortie/parse-benchmark.ts`).
 */

export type PageData = {
  title?: string;
  venue?: string;
  image?: string;
  // ISO start datetime, when we can pull it from schema.org/Event JSON-LD.
  // Lets the wizard pre-select date + time for the user.
  startsAt?: string;
  siteName?: string;
  description?: string;
  /** `location.name` brut du JSON-LD Event, avant tout arbitrage. */
  jsonLdVenue?: string;
  /** `image` du JSON-LD Event — propre à l'événement, contrairement à og:image. */
  jsonLdImage?: string;
  /** `og:image:width` déclaré par la page, quand présent. */
  ogImageWidth?: number;
  /** `startDate` de TOUS les Events JSON-LD (représentations multiples). */
  jsonLdStartDates?: string[];
  /** Texte visible de la page (sans balises ni scripts), tronqué. */
  text?: string;
};

const MAX_TEXT = 20_000;

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

export function decodeHtmlEntities(raw: string): string {
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
  image?: string;
  /** startDate de chaque Event du document, dans l'ordre. */
  startDates: string[];
};

// schema.org `image` : URL, tableau d'URLs, ou ImageObject `{ url }`.
function jsonLdImageUrl(raw: unknown): string | undefined {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first === "string") {
    return first.trim() || undefined;
  }
  if (first && typeof first === "object") {
    const url = (first as { url?: unknown }).url;
    return typeof url === "string" ? url.trim() || undefined : undefined;
  }
  return undefined;
}

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

  // Premier Event trouvé = l'événement ; on continue à parcourir pour
  // relever les startDate des autres représentations.
  let hit: JsonLdHit | null = null;
  const startDates: string[] = [];
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
      if (startsAt) {
        startDates.push(startsAt);
      }
      hit ??= { title: name, venue, startsAt, image: jsonLdImageUrl(obj.image), startDates };
    }
  }
  return hit;
}

function visibleText(html: string): string {
  return decodeHtmlEntities(
    html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t\r\n]+/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
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
export const VENUE_KEYWORDS = [
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

export function looksLikeVenue(s: string | undefined): boolean {
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

export function extractPage(html: string): PageData {
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
  const ogImageWidth = Number(get("og:image:width"));

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

  return {
    title,
    venue,
    image,
    startsAt,
    siteName,
    description,
    jsonLdVenue: jsonLd?.venue ? decodeHtmlEntities(jsonLd.venue) : undefined,
    jsonLdImage: jsonLd?.image ? decodeHtmlEntities(jsonLd.image) : undefined,
    ogImageWidth: ogImageWidth > 0 ? ogImageWidth : undefined,
    jsonLdStartDates: jsonLd?.startDates ?? [],
    text: visibleText(html),
  };
}
