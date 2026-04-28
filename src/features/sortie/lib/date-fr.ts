/**
 * French date helpers with Paris timezone. Uses Intl.DateTimeFormat rather
 * than a date lib — outputs are static strings used in meta tags and hero
 * copy, so a 2-3 KB runtime cost from moment/date-fns isn't justified.
 */

const TZ = "Europe/Paris";

const parisDayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const parisHourMinuteFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Renvoie un Date pointant sur 23:59:59.999 du même jour calendaire
 * Paris que `date`, en gérant proprement les transitions DST (l'offset
 * Paris bascule entre +01:00 en hiver et +02:00 en été).
 *
 * Use-case principal : normaliser les deadlines RSVP pour qu'elles se
 * terminent toujours en fin de journée, peu importe l'heure que l'user
 * a saisie dans le picker. Garantit que "deadline samedi" veut dire
 * "tu as toute la journée de samedi pour répondre" — pas un cut-off
 * arbitraire à 14h dépendant du moment où le créateur a cliqué.
 */
export function endOfDayInParis(date: Date): Date {
  const dayKey = parisDayKeyFormatter.format(date);
  // On teste les deux offsets Paris possibles : +02:00 en été, +01:00
  // en hiver. Critère de sélection : le candidat doit retomber à
  // **23:59 heure Paris** (un mauvais offset décalerait l'heure d'un
  // cran et tomberait à 22:59 ou 00:59).
  for (const offset of ["+02:00", "+01:00"]) {
    const candidate = new Date(`${dayKey}T23:59:59.999${offset}`);
    if (
      parisDayKeyFormatter.format(candidate) === dayKey &&
      parisHourMinuteFormatter.format(candidate) === "23:59"
    ) {
      return candidate;
    }
  }
  // Filet de sécurité : si rien ne matche (impossible en pratique sauf
  // bug Intl), on rentre tout de même un Date valide à ~quelques
  // minutes de la bonne valeur.
  return new Date(`${dayKey}T23:59:59.999+01:00`);
}

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

const parisYearFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  timeZone: TZ,
});

function getParisYear(date: Date): number {
  return Number(parisYearFormatter.format(date));
}

/**
 * Renvoie ` 2027` si l'année de `date` (en Paris) diffère de l'année
 * courante, sinon "". Évite l'année redondante quand on est dans la
 * même année calendaire (cas majoritaire) tout en désambiguïsant les
 * sorties passées d'archive ou planifiées sur l'année suivante.
 */
function yearSuffixIfNeeded(date: Date, now: Date = new Date()): string {
  const dateYear = getParisYear(date);
  const nowYear = getParisYear(now);
  return dateYear !== nowYear ? ` ${dateYear}` : "";
}

/** "jeudi 12 décembre · 20h30" — ajoute l'année si différente de l'année courante */
export function formatOutingDate(date: Date, now: Date = new Date()): string {
  const day = dayMonthFormatter.format(date);
  const time = timeFormatter.format(date).replace(":", "h");
  return `${day}${yearSuffixIfNeeded(date, now)} · ${time}`;
}

/** "jeu. 12 déc. · 20h30" — compact form for lists, année si nécessaire */
export function formatOutingDateShort(date: Date, now: Date = new Date()): string {
  const day = shortDayMonthFormatter.format(date);
  const time = timeFormatter.format(date).replace(":", "h");
  return `${day}${yearSuffixIfNeeded(date, now)} · ${time}`;
}

/** "12 décembre à 20h30" — used in emails, ajoute l'année si nécessaire */
export function formatOutingDateConversational(date: Date, now: Date = new Date()): string {
  const day = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: TZ,
  }).format(date);
  const time = timeFormatter.format(date).replace(":", "h");
  return `${day}${yearSuffixIfNeeded(date, now)} à ${time}`;
}

/** "2026-12-12T20:30" — for datetime-local inputs */
export function toDateTimeLocalValue(date: Date): string {
  const parts = isoFormatter.formatToParts(date);
  const get = (t: Intl.DateTimeFormatPart["type"]) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

const weekdayOnlyFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  timeZone: TZ,
});

const dayMonthNumericFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: TZ,
});

const weekdayDayMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TZ,
});

/** "20h30" — time only, French conventions */
export function formatTimeOnly(date: Date): string {
  return timeFormatter.format(date).replace(":", "h");
}

/**
 * Date phrasing for share previews, optimised for conversion (Meetup +18% RSVP
 * on relative phrasing within a 7-day window).
 *
 * J-0/+2  → "ce soir" / "demain" / "après-demain"
 * J+3/+7  → "ce samedi" (weekday only, feels "this week")
 * J+8/+90 → "samedi 3 mai" (weekday + date, intimate anchoring)
 * J>90    → "3 mai" (weekday name becomes noise at distance)
 */
export function formatRelativeDateForShare(date: Date, now: Date = new Date()): string {
  const daysOut = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysOut < 0) {
    // Past dates: fall through to absolute — share previews of past sorties
    // are an edge case (archived links) and relative language misleads there.
    return `${weekdayDayMonthFormatter.format(date)}${yearSuffixIfNeeded(date, now)}`;
  }
  if (daysOut === 0) {
    return "ce soir";
  }
  if (daysOut === 1) {
    return "demain";
  }
  if (daysOut === 2) {
    return "après-demain";
  }
  if (daysOut <= 7) {
    return `ce ${weekdayOnlyFormatter.format(date)}`;
  }
  if (daysOut <= 90) {
    return `${weekdayDayMonthFormatter.format(date)}${yearSuffixIfNeeded(date, now)}`;
  }
  return `${dayMonthNumericFormatter.format(date)}${yearSuffixIfNeeded(date, now)}`;
}

/**
 * Compact date + time for share description lines:
 * "Samedi 20h30" when near, "Samedi 3 mai · 20h30" when far.
 * Keeps `og:description` dense: heure = projection, date = situation.
 */
export function formatDateTimeForShare(date: Date, now: Date = new Date()): string {
  const rel = formatRelativeDateForShare(date, now);
  const time = formatTimeOnly(date);
  // Capitalise first letter — "ce samedi" → "Ce samedi" at line start.
  const capitalised = rel.charAt(0).toUpperCase() + rel.slice(1);
  return `${capitalised} · ${time}`;
}
