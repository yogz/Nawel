/**
 * Génère un flux iCalendar (`text/calendar`) qui agrège plusieurs
 * sorties pour un user. Sert le endpoint
 * `https://sortie.colist.fr/calendar/<token>.ics` que les apps
 * Calendar (Apple, Google, Outlook) polish périodiquement.
 *
 * Différent du single-event `agenda/route.ts` :
 *   - Plusieurs VEVENT dans un seul VCALENDAR
 *   - TZID:Europe/Paris pour stabilité cross-timezone
 *   - STATUS:CANCELLED quand applicable (le calendar barre l'event)
 *   - DESCRIPTION enrichie : organisateur, nb confirmés, lien billet
 *   - CATEGORIES depuis la vibe (théâtre, opéra...) — coloration
 *     auto sur Apple Calendar
 *   - METHOD:PUBLISH (subscription, pas invitation)
 */

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000; // 3h block

// Le bloc VTIMEZONE Europe/Paris (transitions DST 2025-2030).
// Posé en début de VCALENDAR pour que les clients qui ne connaissent
// pas la zone (rare mais ça arrive) sachent quand passer en CET/CEST.
// Source : standard tzdata, valable jusqu'en 2030 puis à régénérer
// (ou faire pointer sur un service tzdata si on veut être strict).
//
// Stocké comme tableau de lignes (pas string multi-ligne) pour que
// `foldLine` traite chaque ligne indépendamment. Sans ça, le bloc
// entier était vu comme une seule ligne ~400 chars, replié à 73 par
// foldLine, mélangeant CRLF de fold avec LF internes — résultat
// invalide refusé par iCal/Calendar.app et tous les parsers stricts.
const PARIS_VTIMEZONE_LINES = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Paris",
  "BEGIN:STANDARD",
  "DTSTART:20251026T030000",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:20260329T020000",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
];

export type FeedOuting = {
  shortId: string;
  slug: string | null;
  title: string;
  location: string | null;
  fixedDatetime: Date;
  status:
    | "open"
    | "awaiting_purchase"
    | "stale_purchase"
    | "purchased"
    | "past"
    | "settled"
    | "cancelled";
  vibe: "theatre" | "opera" | "concert" | "cine" | "expo" | "autre" | null;
  ticketUrl: string | null;
  creatorName: string | null;
  confirmedCount: number;
};

export type BuildIcsFeedArgs = {
  /** Outings à inclure. Pré-filtrées côté query — le helper ne refilter
   *  pas (il lui suffit de respecter les inputs). */
  outings: FeedOuting[];
  /** Base URL pour les liens DESCRIPTION + URL. */
  publicBase: string;
  /** Nom du calendrier affiché dans le client (Apple, Google).
   *  Default "Sortie" — peut être customisé pour distinguer plusieurs
   *  feeds personnels au cas où. */
  calendarName?: string;
};

export function buildIcsFeed({
  outings,
  publicBase,
  calendarName = "Sortie",
}: BuildIcsFeedArgs): string {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sortie//Sortie FR//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    "X-WR-TIMEZONE:Europe/Paris",
    ...PARIS_VTIMEZONE_LINES,
  ];

  for (const o of outings) {
    const canonical = o.slug ? `${o.slug}-${o.shortId}` : o.shortId;
    const url = `${publicBase}/${canonical}`;
    const endsAt = new Date(o.fixedDatetime.getTime() + DEFAULT_DURATION_MS);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${o.shortId}@sortie.colist.fr`);
    lines.push(`DTSTAMP:${formatIcsUtc(now)}`);
    lines.push(`DTSTART;TZID=Europe/Paris:${formatIcsLocal(o.fixedDatetime)}`);
    lines.push(`DTEND;TZID=Europe/Paris:${formatIcsLocal(endsAt)}`);
    lines.push(`SUMMARY:${escapeIcsText(o.title)}`);
    if (o.location) {
      lines.push(`LOCATION:${escapeIcsText(o.location)}`);
    }
    lines.push(`URL:${url}`);
    lines.push(`DESCRIPTION:${buildDescription(o, url)}`);
    // STATUS:CANCELLED → la plupart des clients barrent l'event
    // visuellement. CONFIRMED par défaut.
    lines.push(`STATUS:${o.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`);
    if (o.vibe) {
      lines.push(`CATEGORIES:${vibeLabel(o.vibe)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  // RFC 5545 : line endings CRLF.
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

function buildDescription(o: FeedOuting, url: string): string {
  const parts: string[] = [];
  if (o.creatorName) {
    parts.push(`Organisé par ${o.creatorName}`);
  }
  if (o.confirmedCount > 0) {
    parts.push(`${o.confirmedCount} confirmé${o.confirmedCount > 1 ? "s" : ""}`);
  }
  if (o.ticketUrl) {
    parts.push(`Billetterie : ${o.ticketUrl}`);
  }
  parts.push(`Détails et RSVP : ${url}`);
  // RFC 5545 escape : `\n` est literal dans la description.
  return escapeIcsText(parts.join("\n"));
}

function vibeLabel(vibe: NonNullable<FeedOuting["vibe"]>): string {
  switch (vibe) {
    case "theatre":
      return "Théâtre";
    case "opera":
      return "Opéra";
    case "concert":
      return "Concert";
    case "cine":
      return "Ciné";
    case "expo":
      return "Expo";
    case "autre":
      return "Sortie";
  }
}

function formatIcsUtc(date: Date): string {
  // `YYYYMMDDTHHMMSSZ` — utilisé pour DTSTAMP (toujours UTC) et
  // pour DTSTART/DTEND quand on ne pose pas TZID.
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
}

function formatIcsLocal(date: Date): string {
  // `YYYYMMDDTHHMMSS` — sans Z, utilisé avec un préfixe TZID. On
  // formate l'heure dans la zone Europe/Paris pour matcher la TZID
  // déclarée. Intl renvoie l'heure-Paris, on parse en composants.
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  // Note : Intl en-GB peut produire "24:00" pour minuit — normalise.
  let hour = get("hour");
  if (hour === "24") {
    hour = "00";
  }
  return `${get("year")}${get("month")}${get("day")}T${hour}${get("minute")}${get("second")}`;
}

function escapeIcsText(value: string): string {
  // RFC 5545 : backslash, semicolon, comma, newlines.
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldLine(line: string): string {
  // RFC 5545 §3.1 : les lignes > 75 octets doivent être pliées avec
  // CRLF + space (continuation). Sans ça, certains clients tronquent.
  // On fold à 73 char (laisse 2 chars de marge pour le CRLF + space).
  const MAX = 73;
  if (line.length <= MAX) {
    return line;
  }
  const chunks: string[] = [];
  let i = 0;
  chunks.push(line.slice(0, MAX));
  i = MAX;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + MAX - 1));
    i += MAX - 1;
  }
  return chunks.join("\r\n");
}
