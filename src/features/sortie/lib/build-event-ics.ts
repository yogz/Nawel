import { canonicalPathSegment } from "./parse-outing-path";
import {
  PARIS_VTIMEZONE_LINES,
  escapeIcsText,
  foldLine,
  formatIcsLocal,
  formatIcsUtc,
} from "./build-ics-feed";

// 3h block when the creator didn't supply an explicit end time —
// cohérent avec build-ics-feed.ts et /agenda/route.ts. Couvre théâtre,
// opéra, concert sans squatter toute la soirée du destinataire.
const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

export type IcsMethod = "PUBLISH" | "CANCEL";

export type OutingIcsContext = {
  shortId: string;
  slug: string | null;
  title: string;
  location: string | null;
  fixedDatetime: Date;
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
};

export type BuildOutingEventIcsInput = {
  outing: OutingIcsContext;
  method: IcsMethod;
  publicBase: string;
};

export type IcsAttachment = {
  content: string;
  filename: string;
  contentType: string;
};

/**
 * Génère un .ics single-event prêt à attacher à un email. UID stable
 * = `${shortId}@sortie.colist.fr` — identique au feed iCal perso et au
 * download `/agenda`, donc les clients (Apple/Google/Outlook) matchent
 * et mettent à jour ou retirent l'event existant selon SEQUENCE/METHOD.
 *
 * Pour CANCEL, le STATUS:CANCELLED + METHOD:CANCEL invite le client à
 * retirer l'event ; pour PUBLISH (création/MAJ), STATUS:CONFIRMED.
 */
export function buildOutingEventIcs(input: BuildOutingEventIcsInput): IcsAttachment {
  const { outing, method, publicBase } = input;
  const now = new Date();
  const endsAt = new Date(outing.fixedDatetime.getTime() + DEFAULT_DURATION_MS);
  const url = `${publicBase}/${canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId })}`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sortie//Sortie FR//FR",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    ...PARIS_VTIMEZONE_LINES,
    "BEGIN:VEVENT",
    `UID:${outing.shortId}@sortie.colist.fr`,
    `SEQUENCE:${outing.sequence}`,
    `CREATED:${formatIcsUtc(outing.createdAt)}`,
    `LAST-MODIFIED:${formatIcsUtc(outing.updatedAt)}`,
    `DTSTAMP:${formatIcsUtc(now)}`,
    `DTSTART;TZID=Europe/Paris:${formatIcsLocal(outing.fixedDatetime)}`,
    `DTEND;TZID=Europe/Paris:${formatIcsLocal(endsAt)}`,
    `SUMMARY:${escapeIcsText(outing.title)}`,
  ];
  if (outing.location) {
    lines.push(`LOCATION:${escapeIcsText(outing.location)}`);
  }
  lines.push(`URL:${url}`);
  lines.push(`DESCRIPTION:${escapeIcsText(`Voir la sortie : ${url}`)}`);
  lines.push(`STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`);
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  const content = lines.map(foldLine).join("\r\n") + "\r\n";

  return {
    content,
    filename: `sortie-${outing.shortId}.ics`,
    contentType: `text/calendar; charset=utf-8; method=${method}`,
  };
}
