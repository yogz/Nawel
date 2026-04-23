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

  const title = get("og:title") ?? get("twitter:title");
  const description = get("og:description") ?? get("twitter:description");
  const image = get("og:image") ?? get("twitter:image");

  // Heuristic: OG descriptions from ticket sites usually contain the venue
  // in the first sentence (e.g. "Rigoletto — Opéra Bastille, Paris"). Take
  // the short first line if it's under 200 chars, otherwise skip — we'd
  // rather the user type the venue than auto-fill a paragraph.
  let venue: string | undefined;
  if (description && description.length <= 200) {
    venue = description.split(/[.\n]/)[0]?.trim();
  }

  return { title, venue, image };
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
