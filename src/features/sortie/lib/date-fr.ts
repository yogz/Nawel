/**
 * French date helpers with Paris timezone. Uses Intl.DateTimeFormat rather
 * than a date lib — outputs are static strings used in meta tags and hero
 * copy, so a 2-3 KB runtime cost from moment/date-fns isn't justified.
 */

const TZ = "Europe/Paris";

const dayMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TZ,
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

const shortDayMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: TZ,
});

const isoFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

/** "jeudi 12 décembre · 20h30" */
export function formatOutingDate(date: Date): string {
  const day = dayMonthFormatter.format(date);
  const time = timeFormatter.format(date).replace(":", "h");
  return `${day} · ${time}`;
}

/** "jeu. 12 déc. · 20h30" — compact form for lists */
export function formatOutingDateShort(date: Date): string {
  const day = shortDayMonthFormatter.format(date);
  const time = timeFormatter.format(date).replace(":", "h");
  return `${day} · ${time}`;
}

/** "12 décembre à 20h30" — used in emails to match conversational tone */
export function formatOutingDateConversational(date: Date): string {
  const day = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: TZ,
  }).format(date);
  const time = timeFormatter.format(date).replace(":", "h");
  return `${day} à ${time}`;
}

/** "2026-12-12T20:30" — for datetime-local inputs */
export function toDateTimeLocalValue(date: Date): string {
  const parts = isoFormatter.formatToParts(date);
  const get = (t: Intl.DateTimeFormatPart["type"]) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
