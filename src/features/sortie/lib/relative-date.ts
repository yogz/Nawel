const WEEKDAY_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/**
 * French-friendly relative distance used on the home hero.
 *   today        → "Aujourd'hui"
 *   tomorrow     → "Demain"
 *   in 2–6 days  → "Vendredi, dans 3 jours"
 *   in 7–13 days → "Dans 1 semaine"
 *   in 14–27 days → "Dans 3 semaines"
 *   28+ days     → null  (the absolute date carries enough — keeping a
 *                  relative span here would just repeat what
 *                  `formatOutingDate` is already saying, e.g.
 *                  "Mercredi 24 juin · mercredi 24 juin · 22h00")
 *
 * Paris timezone is implied — `new Date()` on the server follows
 * `TZ=Europe/Paris` in prod, and formatting happens in local time.
 */
export function relativeOutingHero(date: Date, now = new Date()): string | null {
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
  if (diffDays >= 7 && diffDays < 14) {
    return "Dans 1 semaine";
  }
  if (diffDays >= 14 && diffDays < 28) {
    return `Dans ${Math.floor(diffDays / 7)} semaines`;
  }
  if (diffDays < 0 && diffDays > -7) {
    return `Il y a ${-diffDays} jour${-diffDays > 1 ? "s" : ""}`;
  }
  return null;
}
