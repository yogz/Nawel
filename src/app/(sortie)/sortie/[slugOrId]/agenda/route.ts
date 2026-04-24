import { NextResponse } from "next/server";
import { getOutingByShortId } from "@/features/sortie/queries/outing-queries";
import { extractShortId } from "@/features/sortie/lib/parse-outing-path";

const PUBLIC_BASE = process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr";

// Default duration when the creator didn't supply one. Most theatre /
// opera / concert outings run ~2h30 — 3h gives a safe block without
// leaking into the rest of the evening on the user's calendar.
const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

/**
 * Returns the outing as an iCalendar (.ics) file so iOS, Android,
 * Gmail, Outlook etc. can import it into their native calendar.
 * URL: `/<slugOrId>/agenda`. The browser treats the `text/calendar`
 * Content-Type plus the `.ics` Content-Disposition filename as an
 * "Add to Calendar" trigger on mobile.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slugOrId: string }> }) {
  const { slugOrId } = await params;
  const shortId = extractShortId(slugOrId);
  if (!shortId) {
    return new NextResponse("Not found", { status: 404 });
  }
  const outing = await getOutingByShortId(shortId);
  if (!outing || outing.status === "cancelled" || !outing.fixedDatetime) {
    return new NextResponse("Not found", { status: 404 });
  }

  const canonicalPath = outing.slug ? `${outing.slug}-${outing.shortId}` : outing.shortId;
  const outingUrl = `${PUBLIC_BASE}/${canonicalPath}`;

  const ics = buildIcs({
    uid: `${outing.shortId}@sortie.colist.fr`,
    title: outing.title,
    startsAt: outing.fixedDatetime,
    // We don't know the real end time — pad with the default duration
    // rather than stretching to a full day, which would clog the
    // calendar for the whole evening with a block event.
    endsAt: new Date(outing.fixedDatetime.getTime() + DEFAULT_DURATION_MS),
    location: outing.location,
    url: outingUrl,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="sortie-${outing.shortId}.ics"`,
      // The calendar file is safe to cache briefly — event updates
      // should invalidate via the generateMetadata revalidate path on
      // the parent page. 5 minutes keeps WhatsApp / iOS previews from
      // re-downloading on every tap.
      "Cache-Control": "public, max-age=300",
    },
  });
}

function formatIcsDate(date: Date): string {
  // iCalendar UTC format: `YYYYMMDDTHHMMSSZ`. Calendar apps convert to
  // the viewer's local timezone on import, which is what we want.
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
}

function escapeIcsText(value: string): string {
  // RFC 5545 escaping: backslash, semicolon, comma, newlines.
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function buildIcs(args: {
  uid: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  url: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sortie//Sortie FR//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${args.uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(args.startsAt)}`,
    `DTEND:${formatIcsDate(args.endsAt)}`,
    `SUMMARY:${escapeIcsText(args.title)}`,
  ];
  if (args.location) {
    lines.push(`LOCATION:${escapeIcsText(args.location)}`);
  }
  lines.push(`URL:${args.url}`);
  lines.push(`DESCRIPTION:${escapeIcsText(`Voir la sortie sur ${args.url}`)}`);
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");
  // RFC 5545 line ending is CRLF.
  return lines.join("\r\n") + "\r\n";
}
