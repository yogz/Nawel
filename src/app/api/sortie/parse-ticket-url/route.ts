import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { trackParseAttempt, type ParseOutcome } from "@/features/sortie/lib/parse-stats";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { isLikelyPrivateHostname } from "@/features/sortie/lib/safe-fetch";
import { parseEventUrl } from "@/features/sortie/lib/event-parse/parse-event-url";

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

export async function POST(request: NextRequest) {
  // Rate-limit IP en tête de route : ce endpoint déclenche un fetch
  // externe + potentiellement un appel Discovery API Ticketmaster, donc
  // chaque requête a un coût. 10 req/min/IP couvre le cas d'usage normal
  // (un user qui colle plusieurs URLs de suite dans le wizard) sans laisser
  // un attaquant amplifier vers des cibles internes. IP lue directement
  // depuis la NextRequest plutôt que via headers() — évite le request-scope
  // async store, et c'est sync donc testable sans mock.
  const xff = request.headers.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0]!.trim() : (request.headers.get("x-real-ip") ?? "unknown");
  const gate = await rateLimit({
    key: `parse-ticket:${ip}`,
    limit: 10,
    windowSeconds: 60,
  });
  if (!gate.ok) {
    return NextResponse.json({ error: "rate_limited", message: gate.message }, { status: 429 });
  }

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
  // Court-circuit pour les IP littérales privées/loopback : feedback 400
  // immédiat, pas de fetch tenté. Le DNS rebinding (domaine qui résout
  // vers 127.0.0.1) reste couvert plus tard par safeFetchExternal qui
  // refait la résolution + check IP au moment du fetch.
  if (isLikelyPrivateHostname(target.hostname)) {
    trackParseAttempt(target.hostname, "fetch_error", target.pathname);
    return NextResponse.json({ error: "blocked_host" }, { status: 400 });
  }

  const { event, telemetry } = await parseEventUrl(target);

  // Telemetry par hostname. On ne juge que ce que la PAGE a donné
  // (og + JSON-LD), pas les fallbacks slug / Discovery API : c'est
  // bien le scraper qu'on veut surveiller. Pour les hosts CTS Eventim
  // on marque "blocked_waf" plutôt que "fetch_error" — c'est un blocage
  // par design, pas un bug à fixer, on isole le faux positif dans la table.
  const outcome: ParseOutcome = telemetry.wafBlocked
    ? "blocked_waf"
    : !telemetry.fetched
      ? "fetch_error"
      : telemetry.pageGotSomething
        ? "success"
        : "zero_data";
  trackParseAttempt(target.hostname, outcome, target.pathname, telemetry.pageImage);

  return NextResponse.json(event);
}
