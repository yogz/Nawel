/**
 * Génère un flux iCalendar (`text/calendar`) qui agrège plusieurs
 * sorties pour un user. Sert le endpoint
 * `https://sortie.colist.fr/calendar/<token>.ics` que les apps
 * Calendar (Apple, Google, Outlook) polish périodiquement.
 *
 * Différent du single-event `agenda/route.ts` :
 *   - Plusieurs VEVENT dans un seul VCALENDAR
 *   - TZID:Europe/Paris pour stabilité cross-timezone
 *   - STATUS: CANCELLED (sortie annulée), TENTATIVE (mode vote, slot
 *     candidat pas encore figé) ou CONFIRMED (date tranchée)
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
  /** Bumpé en DB à chaque transition de status / édition de contenu.
   *  RFC 5545 §3.8.7.4 — sans ça, Apple/Outlook ignorent les updates. */
  sequence: number;
  /** RFC 5545 §3.8.7.1 — propriété CREATED. */
  createdAt: Date;
  /** RFC 5545 §3.8.7.3 — propriété LAST-MODIFIED. */
  updatedAt: Date;
  confirmedCount: number;
  /** Prénoms des confirmed (créateur exclu, user-courant exclu, triés
   *  par early bird). Capé côté query à 12 ; le builder n'en affiche
   *  que 6 + "+N autres" pour ne pas saturer le panneau détail. */
  confirmedNames: string[];
  /** Response du user-courant sur cette sortie. NULL = user est le
   *  créateur (cf. commentaire dans `feedOutingsForUser`). Sert à
   *  décider TRANSP:OPAQUE vs TRANSP:TRANSPARENT et le suffixe
   *  " · à confirmer" sur le SUMMARY. */
  userResponse: "yes" | "no" | "handle_own" | "interested" | null;
  /** ID du timeslot quand cette row représente une *candidate* en mode
   *  vote pas-encore-figé (l'user a voté `available = true` sur ce
   *  créneau). Le builder fabrique un UID dérivé `${shortId}-${id}` au
   *  lieu du canonique pour que pluseurs candidates de la même sortie
   *  cohabitent dans le flux. Null pour fixed-mode ou vote-mode picked.
   *  Une fois pickTimeslot déclenché, les candidate UIDs sortent du
   *  feed → le client agenda les retire ; le canonique entre. */
  candidateTimeslotId: string | null;
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
    const isFigee = isOutingFigee(o);

    lines.push("BEGIN:VEVENT");
    // UID dérivé pour les candidates en mode vote unpicked : permet à
    // plusieurs candidates de la même sortie de cohabiter dans le feed
    // (1 par créneau voté). Une fois pickTimeslot fired, le UID
    // canonique remplace tous les candidates → calendar les retire.
    const uid = o.candidateTimeslotId
      ? `${o.shortId}-${o.candidateTimeslotId}@sortie.colist.fr`
      : `${o.shortId}@sortie.colist.fr`;
    lines.push(`UID:${uid}`);
    // SEQUENCE / CREATED / LAST-MODIFIED : indispensables pour que les
    // clients calendar (Apple, Outlook surtout) re-rendent leur copie
    // locale au refresh — sans ça, un changement de status / suffixe
    // SUMMARY / TRANSP reste invisible côté agenda. RFC 5545 §3.8.7.
    lines.push(`SEQUENCE:${o.sequence}`);
    lines.push(`CREATED:${formatIcsUtc(o.createdAt)}`);
    lines.push(`LAST-MODIFIED:${formatIcsUtc(o.updatedAt)}`);
    lines.push(`DTSTAMP:${formatIcsUtc(now)}`);
    lines.push(`DTSTART;TZID=Europe/Paris:${formatIcsLocal(o.fixedDatetime)}`);
    lines.push(`DTEND;TZID=Europe/Paris:${formatIcsLocal(endsAt)}`);
    // Suffixe " · à confirmer" quand pas figé : signal humain visible
    // sur tous les clients (vue mois Apple/Proton ignorent souvent
    // STATUS:TENTATIVE, donc on porte la sémantique dans le titre).
    const summary = isFigee ? o.title : `${o.title} · à confirmer`;
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    if (o.location) {
      lines.push(`LOCATION:${escapeIcsText(o.location)}`);
    }
    lines.push(`URL:${url}`);
    lines.push(`DESCRIPTION:${buildDescription(o, url)}`);
    // STATUS:TENTATIVE uniquement pour les *candidates* en mode vote
    // pas-encore-figé (1 row par slot voté). Là, la sémantique iCal
    // "événement candidat, date pas tranchée" colle exactement, et
    // les clients qui le respectent (Google Calendar, Outlook
    // desktop) rendent un visuel "à confirmer" cohérent. Pour un
    // event canonique (date déjà figée) ou un user "interested" sur
    // une sortie picked, on reste CONFIRMED — la date est tranchée,
    // seul l'engagement personnel l'est pas, et c'est le rôle de
    // TRANSP + suffixe SUMMARY de le porter.
    const icsStatus =
      o.status === "cancelled"
        ? "CANCELLED"
        : o.candidateTimeslotId !== null
          ? "TENTATIVE"
          : "CONFIRMED";
    lines.push(`STATUS:${icsStatus}`);
    // TRANSP:OPAQUE bloque la dispo dans free/busy (le user est engagé) ;
    // TRANSP:TRANSPARENT laisse libre (rien n'est encore figé). RFC 5545
    // §3.8.2.7. Sémantique propre et universellement supportée — Cal.com
    // et autres outils de scheduling lisent ça pour proposer des slots.
    lines.push(`TRANSP:${isFigee ? "OPAQUE" : "TRANSPARENT"}`);
    if (o.vibe) {
      lines.push(`CATEGORIES:${vibeLabel(o.vibe)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  // RFC 5545 : line endings CRLF.
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/**
 * Une sortie est "figée" pour le user-courant quand :
 *   - elle n'est pas annulée,
 *   - ET (les billets sont pris OU le user a déjà dit yes pour lui-même,
 *     donc bloque sa dispo dans son agenda peu importe que les billets
 *     soient achetés ou pas — son mental model "j'y vais" tient).
 *
 * Quand `userResponse === null`, le user est le créateur (cf. WHERE
 * clause de `feedOutingsForUser`) — on le considère implicitement comme
 * "yes" (le créateur vient sur ses propres sorties par défaut).
 */
function isOutingFigee(o: FeedOuting): boolean {
  if (o.status === "cancelled") {
    return false;
  }
  if (o.status === "purchased" || o.status === "past" || o.status === "settled") {
    return true;
  }
  // status in (open, awaiting_purchase, stale_purchase) → dépend de la
  // décision personnelle du user.
  return o.userResponse === null || o.userResponse === "yes" || o.userResponse === "handle_own";
}

// Cap d'affichage des prénoms confirmed dans la description. Au-delà,
// on tombe sur "+N autres" pour ne pas saturer le panneau détail des
// clients calendar (qui rendent la DESCRIPTION en bloc pré-formaté).
const NAMES_DISPLAY_CAP = 6;

function buildDescription(o: FeedOuting, url: string): string {
  const parts: string[] = [];
  if (o.creatorName) {
    parts.push(`Organisé par ${o.creatorName}`);
  }
  if (o.confirmedCount > 0) {
    const namesLine = formatConfirmedNames(o);
    if (namesLine) {
      parts.push(namesLine);
    } else {
      parts.push(`${o.confirmedCount} confirmé${o.confirmedCount > 1 ? "s" : ""}`);
    }
  }
  if (o.ticketUrl) {
    parts.push(`Billetterie : ${o.ticketUrl}`);
  }
  parts.push(`Détails et RSVP : ${url}`);
  // RFC 5545 escape : `\n` est literal dans la description.
  return escapeIcsText(parts.join("\n"));
}

/**
 * Format "9 confirmés : Tom, Marc, Sophie, Anaïs, Julien, Yuki + 3 autres".
 * Quand on n'a pas du tout de prénoms (créateur+user-courant exclus de
 * la sub-query, et tous les autres sont anon sans nom — théorique
 * vu que displayName est requis), on retombe sur le simple compteur
 * via le caller.
 */
function formatConfirmedNames(o: FeedOuting): string | null {
  if (o.confirmedNames.length === 0) {
    return null;
  }
  const shown = o.confirmedNames.slice(0, NAMES_DISPLAY_CAP);
  // confirmedCount = total des `yes`+`handle_own` (créateur inclus si
  // créateur a son row participant) ; confirmedNames exclut user-courant
  // ET créateur. Le "reste" affiché est le delta entre count et noms
  // affichés, plancher 0.
  const remaining = Math.max(0, o.confirmedCount - shown.length);
  const list = shown.join(", ");
  const suffix = remaining > 0 ? ` + ${remaining} autre${remaining > 1 ? "s" : ""}` : "";
  return `${o.confirmedCount} confirmé${o.confirmedCount > 1 ? "s" : ""} : ${list}${suffix}`;
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
