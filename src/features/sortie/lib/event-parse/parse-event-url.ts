import { searchTicketmasterEvents } from "@/features/sortie/lib/ticketmaster-search";
import { safeFetchExternal } from "@/features/sortie/lib/safe-fetch";
import { isGenericImageUrl, pickPageImage } from "./event-image";
import { findShowTime, toParisDateTime, type ParisDateTime } from "./date-time";
import { isTicketmasterMatch } from "./ticketmaster-match";
import { pickVenue } from "./venue";
import { extractPage, VENUE_KEYWORDS, type PageData } from "./extract-page";

const MAX_BYTES = 500 * 1024; // 500 KB — covers OG headers on any real page
const TIMEOUT_MS = 5000;

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

/**
 * Une salle déduite du slug n'est crédible que courte et sans chiffres :
 * « l-oeuvre-paris-29-mai-2026-css5-theatredeloeuvre-pg101-ri11689401 »
 * (Digitick) n'est pas un nom de salle, mieux vaut rien.
 */
function sameName(a: string | undefined, b: string): boolean {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  return Boolean(a) && norm(a!) === norm(b);
}

function plausibleSlugVenue(venue: string | undefined): string | undefined {
  return venue && venue.length <= 40 && !/\d/.test(venue) ? venue : undefined;
}

/**
 * Date + heure (Paris) données par la page. L'heure n'est retenue que si
 * elle est sûre : présente dans le startDate, cohérente entre toutes les
 * représentations JSON-LD, sinon trouvée sans ambiguïté près de la date
 * dans le texte (cf. date-time.ts).
 */
function pageDateTime(page: PageData): ParisDateTime {
  const { date, time } = toParisDateTime(page.startsAt);
  if (!date) {
    return { date: null, time: null };
  }
  const performanceTimes = new Set(
    (page.jsonLdStartDates ?? []).map((s) => toParisDateTime(s).time).filter(Boolean)
  );
  if (performanceTimes.size > 1) {
    return { date, time: null };
  }
  if (time) {
    return { date, time };
  }
  return { date, time: findShowTime(`${page.description ?? ""} ${page.text ?? ""}`, date) };
}

export type ParserHint = { kind: "waf" | "spa"; siteName: string; suggestion: string };

export type ParsedEvent = {
  title: string | null;
  venue: string | null;
  image: string | null;
  /** "YYYY-MM-DD", Europe/Paris. */
  date: string | null;
  /** "HH:MM", Europe/Paris — null si la page ne la donne pas sans ambiguïté. */
  time: string | null;
  ticketUrl: string;
  parserHint: ParserHint | null;
};

/** Ce que la route a besoin de savoir pour `trackParseAttempt`. */
export type ParseTelemetry = {
  fetched: boolean;
  wafBlocked: boolean;
  /** La PAGE (og + JSON-LD) a donné au moins un champ — hors slug / Discovery. */
  pageGotSomething: boolean;
  /** La PAGE a donné une image — hors Discovery. */
  pageImage: boolean;
};

/**
 * Cœur du parse d'un lien de spectacle : fetch de la page, extraction,
 * fallback slug, enrichissement Ticketmaster, hint utilisateur. Sans
 * rate-limit ni télémétrie (gérés par la route) pour que le benchmark
 * puisse l'appeler sans écrire dans `parse_stats`.
 */
export async function parseEventUrl(
  target: URL
): Promise<{ event: ParsedEvent; telemetry: ParseTelemetry }> {
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
    ? { data: {} as PageData, fetched: false }
    : await fetchAndParseOg(target);
  const og: PageData = fetchResult.data;

  // Discovery API enrichment :
  //   - Pour ticketmaster.fr : on extrait le keyword du slug et on
  //     query Discovery — gives us image + date + venue sans toucher
  //     la page (qui peut être WAF-protégée). On SKIPPE si l'OG a
  //     déjà ramené title + venue + image + startsAt : pas la peine
  //     de payer un appel TM pour des données qu'on a déjà.
  //   - Pour les hosts CTS Eventim (Fnac Spectacles, France Billet…) :
  //     même logique, mais le keyword vient du slug humanisé. CTS
  //     Eventim possède aussi Ticketmaster en Europe → fort taux de
  //     mirroring du catalogue. PAS de skip ici : leur WAF nous a
  //     bloqué, og est vide, TM est notre seul espoir.
  //   - Best-effort dans tous les cas : empty result OK.
  let tm: { title?: string; venue?: string; image?: string; startsAt?: string } = {};
  const normHost = normalizeHostname(target.hostname);
  // Affiche de la page, logos et images de site écartés (cf. event-image.ts).
  const pageImage = pickPageImage(og, target);
  // Vrai nom de la salle (salle interne / adresse écartées, cf. venue.ts).
  const pageVenue = pickVenue({
    jsonLdVenue: og.jsonLdVenue,
    siteName: og.siteName,
    legacyVenue: og.venue,
    hostname: target.hostname,
  });
  const ogIsComplete = Boolean(og.title && pageVenue && pageImage && og.startsAt);
  let discoveryKeyword: string | null = null;
  if (normHost === "ticketmaster.fr" && !ogIsComplete) {
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

  // Sites de salles sans affiche exploitable (hors Ticketmaster / CTS,
  // traités ci-dessus tels quels) : recherche du spectacle par son titre.
  // Le résultat n'est retenu que s'il correspond (titre, et date quand la
  // page en a donné une) — une image d'un autre spectacle est pire que
  // rien. Il ne remplit que les champs vides (cf. fusion plus bas).
  const pageWhen = pageDateTime(og);
  // Un « titre » qui n'est que le nom du site / de la salle (page générique,
  // 404) ramènerait n'importe quel spectacle de cette salle : pas de recherche.
  const candidateTitle = og.title || slug.title;
  const searchTitle =
    candidateTitle && ![og.siteName, pageVenue].some((n) => sameName(n, candidateTitle))
      ? candidateTitle
      : undefined;
  // Plusieurs représentations trouvées à des heures différentes (matinée /
  // soirée) : l'heure de la première n'est pas celle que l'utilisateur
  // choisira, on ne la reprend pas (même règle que pour le JSON-LD).
  let tmTimeAmbiguous = false;
  if (!discoveryKeyword && !pageImage && searchTitle) {
    const events = await searchTicketmasterEvents(searchTitle, 3, "parse-enrich");
    const matches = events.filter((e) =>
      isTicketmasterMatch(e, { title: searchTitle, date: pageWhen.date })
    );
    const match = matches[0];
    tmTimeAmbiguous =
      new Set(matches.map((e) => toParisDateTime(e.startsAt).time).filter(Boolean)).size > 1;
    if (match) {
      tm = {
        title: match.title,
        venue: match.venue ?? undefined,
        image: match.image ?? undefined,
        startsAt: match.startsAt ?? undefined,
      };
    }
  }

  // Merge priority: page-extracted (canonical when available) > TM API
  // enrichment > URL-slug. The slug is always last because it's the
  // crudest signal — the page or API will be more accurate when they
  // ship something usable.
  const title = og.title || tm.title || slug.title;
  const venue = pageVenue || tm.venue || plausibleSlugVenue(slug.venue);
  // Les images de catégorie Ticketmaster (/dam/c/) ne sont pas des affiches.
  const tmImage =
    tm.image && !isGenericImageUrl(tm.image, { hostname: "s1.ticketm.net" }) ? tm.image : undefined;
  const image = pageImage || tmImage;
  // Date/heure de la page d'abord, sinon celles de Ticketmaster ; l'heure
  // Ticketmaster complète une date de page sans heure si c'est le même jour.
  const tmParsed = toParisDateTime(tm.startsAt);
  const tmWhen: ParisDateTime = tmTimeAmbiguous ? { date: tmParsed.date, time: null } : tmParsed;
  const when: ParisDateTime = !pageWhen.date
    ? tmWhen
    : {
        date: pageWhen.date,
        time: pageWhen.time ?? (tmWhen.date === pageWhen.date ? tmWhen.time : null),
      };

  // Hint user-facing unifié pour les deux cas où le scraping ne peut
  // rien remonter de la page (par design, pas par bug) :
  //   - "waf" : site anti-bot (groupe CTS Eventim — Fnac Spectacles…)
  //   - "spa" : site rendu côté client (Pathé, UGC…)
  // Dans les deux cas on dit ce qui se passe + une alternative
  // concrète pour la prochaine fois. Affiché toujours pour les WAF
  // (le hint vaut même si Discovery a enrichi), affiché pour les SPA
  // uniquement quand on n'a vraiment rien remonté (le slug fallback
  // marche souvent).
  const nothingUseful = !title && !venue && !image && !when.date;
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

  return {
    event: {
      title: title ?? null,
      venue: venue ?? null,
      image: image ?? null,
      date: when.date,
      time: when.time,
      ticketUrl: target.toString(),
      parserHint,
    },
    telemetry: {
      fetched: fetchResult.fetched,
      wafBlocked,
      pageGotSomething: Boolean(og.title || og.venue || pageImage || og.startsAt),
      pageImage: Boolean(pageImage),
    },
  };
}

/**
 * Fetch the target URL with a realistic mobile UA and pull OG /
 * JSON-LD metadata out of the response. Returns an empty `PageData` for
 * any failure mode (timeout, non-HTML response, 4xx/5xx, anti-bot
 * challenge with no structured data) — the caller falls back to slug
 * extraction or API enrichment.
 *
 * Previously this was the entire POST body; broken out so the handler
 * can layer slug + Discovery API enrichment on top of whatever the
 * page gives us, instead of bailing out the moment fetch hiccups.
 */
type FetchResult = { data: PageData; fetched: boolean };

async function fetchAndParseOg(target: URL): Promise<FetchResult> {
  const result = await safeFetchExternal(target.toString(), {
    timeoutMs: TIMEOUT_MS,
    maxBytes: MAX_BYTES,
    acceptContentTypes: ["text/html"],
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
  if (!result.ok) {
    if (result.reason !== "blocked_host" && result.reason !== "wrong_content_type") {
      console.warn("[parse-ticket-url] fetch failed:", result.reason);
    }
    return { data: {}, fetched: false };
  }
  const html = new TextDecoder("utf-8", { fatal: false }).decode(result.body);
  return { data: extractPage(html), fetched: true };
}
