import type { AgendaItem } from "@/features/sortie/queries/outing-queries";
import { parisDayKey } from "./date-fr";

const TZ = "Europe/Paris";

const monthLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
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
  /** `true` si la cellule est en dehors de la fenêtre [now, now+90j]. */
  outOfWindow: boolean;
  /** `true` si c'est aujourd'hui (Paris). */
  isToday: boolean;
};

export type MonthGrid = {
  /** "mai 2026" — formaté pour affichage. */
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
 * Construit `monthCount` mois calendaires à partir du mois de `now`,
 * en grille hebdo lundi-first. Marque `outOfWindow` les jours hors de
 * [now, now+windowDays] pour les rendre en grisé.
 */
export function buildMonthGrids(
  now: Date,
  buckets: Map<string, DayBucket>,
  monthCount = 3,
  windowDays = 90
): MonthGrid[] {
  const todayKey = parisDayKey(now);
  const windowEndKey = parisDayKey(new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000));

  // 1er jour du mois courant en Paris : on prend YYYY-MM-01.
  const firstMonthKey = todayKey.slice(0, 7) + "-01";
  const [startYear, startMonth] = firstMonthKey.split("-").map(Number);

  const grids: MonthGrid[] = [];
  for (let i = 0; i < monthCount; i++) {
    const year = startYear + Math.floor((startMonth - 1 + i) / 12);
    const month = ((startMonth - 1 + i) % 12) + 1;
    const monthStartKey = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthStart = new Date(`${monthStartKey}T12:00:00+02:00`);

    // Nombre de jours du mois : on fait monthStart+32j puis on backtrack
    // au 1er du mois suivant; trick éprouvé.
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
      const dayKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const date = new Date(`${dayKey}T12:00:00+02:00`);
      const cell: DayCell = {
        dayKey,
        date,
        dayOfMonth: d,
        outOfWindow: dayKey < todayKey || dayKey > windowEndKey,
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

    grids.push({
      label: monthLabelFormatter.format(monthStart),
      monthStart,
      itemCount,
      weeks,
    });
  }
  return grids;
}
