const WEEKDAY_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/**
 * French-friendly relative distance used on the home hero.
 *   today       → "Aujourd'hui"
 *   tomorrow    → "Demain"
 *   in 2–6 days → "Vendredi, dans 3 jours"
 *   week-ish+   → "Vendredi 5 mai"
 *
 * Paris timezone is implied — `new Date()` on the server follows
 * `TZ=Europe/Paris` in prod, and formatting happens in local time.
 */
export function relativeOutingHero(date: Date, now = new Date()): string {
  const startOfDay = (d: Date) => {
    const next = new Date(d);
    next.setHours(0, 0, 0, 0);
    return next;
  };
  const diffDays = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86400000);

  if (diffDays === 0) {
    return "Aujourd'hui";
  }
  if (diffDays === 1) {
    return "Demain";
  }
  if (diffDays > 1 && diffDays < 7) {
    return `${WEEKDAY_FR[date.getDay()]}, dans ${diffDays} jours`;
  }
  if (diffDays < 0 && diffDays > -7) {
    return `Il y a ${-diffDays} jour${-diffDays > 1 ? "s" : ""}`;
  }
  return `${WEEKDAY_FR[date.getDay()]} ${date.getDate()} ${monthFr(date.getMonth())}`;
}

const MONTH_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function monthFr(idx: number): string {
  return MONTH_FR[idx] ?? "";
}
