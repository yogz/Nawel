import type { AgendaItem } from "@/features/sortie/queries/outing-queries";
import { parisDayKey } from "./date-fr";

const TZ = "Europe/Paris";

const longMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: TZ,
});

const monthOnlyFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  timeZone: TZ,
});

const parisYearFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  timeZone: TZ,
});

// Lundi-first weekday position (lundi=0 … dimanche=6) du jour Paris.
// `Intl.DateTimeFormat({ weekday: 'short' })` ne donne pas l'index, donc
// on passe par toLocaleString avec `weekday: 'narrow'` puis lookup. Plus
// fiable : on construit une `Date` à midi Paris et on lit `getDay()` —
// midi évite les pièges DST où minuit local pourrait basculer la veille.
function parisWeekdayMondayFirst(dayKey: string): number {
  const noon = new Date(`${dayKey}T12:00:00+02:00`);
  // getDay() : 0 = dimanche, 1 = lundi … 6 = samedi.
  const sundayFirst = noon.getDay();
  return (sundayFirst + 6) % 7;
}

export type DayBucket = {
  dayKey: string;
  /** Date à midi Paris — assez précis pour les formatters jour/mois. */
  date: Date;
  fixed: AgendaItem[];
  /** Une entrée par timeslot candidat tombant ce jour-là. */
  vote: { item: AgendaItem; slotDate: Date }[];
};

export type DayCell = {
  dayKey: string;
  date: Date;
  dayOfMonth: number;
  /** `true` si la cellule est en dehors de la fenêtre [now, now+windowDays].
   * Les jours hors fenêtre sont rendus grisés ; le user peut naviguer
   * vers eux mais aucun event n'y figure (pas de data côté serveur). */
  outOfWindow: boolean;
  /** `true` si c'est aujourd'hui (Paris). */
  isToday: boolean;
};

export type MonthGrid = {
  /** "2026-05" — clé stable pour keys React et animation slide. */
  monthKey: string;
  /** "mai 2026" — affiché en gros au-dessus de la grille. */
  label: string;
  /** Y-M de référence pour le mois (1er du mois en Paris). */
  monthStart: Date;
  /** Compteur d'items (datée + sondage) sur le mois entier. */
  itemCount: number;
  /** Lignes de 7 cellules (lundi-first). Cases adj des mois voisins = null. */
  weeks: Array<Array<DayCell | null>>;
};

/**
 * Indexe les items par jour Paris : fixedDate pour les sorties datées,
 * un slot par jour pour les sondages (un sondage avec 3 candidats sur
 * 3 jours différents génère 3 entrées dans 3 buckets).
 */
export function bucketAgendaByDay(items: AgendaItem[]): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>();
  const ensure = (dayKey: string) => {
    let bucket = map.get(dayKey);
    if (!bucket) {
      // Date à midi Paris du jour — sert juste aux formatters d'en-tête,
      // pas à la sémantique métier.
      const noon = new Date(`${dayKey}T12:00:00+02:00`);
      bucket = { dayKey, date: noon, fixed: [], vote: [] };
      map.set(dayKey, bucket);
    }
    return bucket;
  };
  for (const item of items) {
    if (item.mode === "fixed" && item.fixedDate) {
      const key = parisDayKey(item.fixedDate);
      ensure(key).fixed.push(item);
    } else if (item.mode === "vote") {
      for (const slot of item.candidateDates) {
        const key = parisDayKey(slot);
        ensure(key).vote.push({ item, slotDate: slot });
      }
    }
  }
  return map;
}

/**
 * Identifie le mois calendaire situé à `monthOffset` mois du mois de
 * `now`. Calcul léger (pas de grille hebdo) : utilisé pour synchroniser
 * la timeline avec le mois affiché par la vue calendrier sans rebuild.
 * Le label drop l'année quand elle matche celle de `now` (cas majoritaire).
 */
export function monthAtOffset(
  now: Date,
  monthOffset: number
): { monthKey: string; label: string; monthStart: Date } {
  const todayKey = parisDayKey(now);
  const [startYear, startMonth] = todayKey.slice(0, 7).split("-").map(Number);
  // Index 0-based combiné (year-mois) puis modulo 12 avec correction
  // pour les offsets négatifs (en JS, `-1 % 12 === -1` au lieu de `11`).
  const combined = startMonth - 1 + monthOffset;
  const year = startYear + Math.floor(combined / 12);
  const month = (((combined % 12) + 12) % 12) + 1;

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const monthStart = new Date(`${monthKey}-01T12:00:00+02:00`);

  const nowYear = Number(parisYearFormatter.format(now));
  const label =
    year === nowYear
      ? monthOnlyFormatter.format(monthStart)
      : longMonthFormatter.format(monthStart);

  return { monthKey, label, monthStart };
}

/**
 * Construit la grille hebdo lundi-first d'un mois calendaire situé à
 * `monthOffset` mois du mois courant. `0` = mois de today, `+1` = mois
 * suivant, `-1` = mois précédent. Pas de borne supérieure : le composant
 * gère l'état d'offset, le user peut naviguer librement (les jours hors
 * fenêtre data sont juste rendus grisés sans events).
 */
export function buildMonthGrid(
  now: Date,
  buckets: Map<string, DayBucket>,
  monthOffset: number,
  windowDays = 365,
  // Borne basse de la fenêtre data (jours en arrière de `now`). 0 par
  // défaut — comportement historique "future-only" pour les surfaces
  // home. Sur /agenda on passe 365 pour permettre de browse les passées.
  windowDaysBack = 0
): MonthGrid {
  const todayKey = parisDayKey(now);
  const windowStartKey = parisDayKey(
    new Date(now.getTime() - windowDaysBack * 24 * 60 * 60 * 1000)
  );
  const windowEndKey = parisDayKey(new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000));

  const { monthKey, label, monthStart } = monthAtOffset(now, monthOffset);
  const [year, month] = monthKey.split("-").map(Number);
  const monthStartKey = `${monthKey}-01`;

  // Nombre de jours du mois : différence en jours entre le 1er du mois
  // suivant et celui-ci. On évite les pièges 28/29/30/31 ainsi.
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthStartKey = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  const daysInMonth = Math.round(
    (new Date(`${nextMonthStartKey}T12:00:00+02:00`).getTime() - monthStart.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const firstWeekday = parisWeekdayMondayFirst(monthStartKey);
  const weeks: Array<Array<DayCell | null>> = [];
  let week: Array<DayCell | null> = Array(firstWeekday).fill(null);
  let itemCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayKey = `${monthKey}-${String(d).padStart(2, "0")}`;
    const date = new Date(`${dayKey}T12:00:00+02:00`);
    const cell: DayCell = {
      dayKey,
      date,
      dayOfMonth: d,
      outOfWindow: dayKey < windowStartKey || dayKey > windowEndKey,
      isToday: dayKey === todayKey,
    };
    week.push(cell);
    const bucket = buckets.get(dayKey);
    if (bucket) {
      itemCount += bucket.fixed.length + bucket.vote.length;
    }
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push(week);
  }

  return {
    monthKey,
    label,
    monthStart,
    itemCount,
    weeks,
  };
}
