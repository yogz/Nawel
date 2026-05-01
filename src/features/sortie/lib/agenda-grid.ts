import type { AgendaItem } from "@/features/sortie/queries/outing-queries";
import { parisDayKey } from "./date-fr";

const TZ = "Europe/Paris";

const shortMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
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

// Avance/recule un dayKey de N jours en Paris. On pivote via UTC midi : un
// shift par 86400 s donne toujours le jour Paris suivant, peu importe le
// passage DST (Paris bascule à 03:00, midi UTC est toujours bien dans la
// même journée Paris).
function addDaysToDayKey(dayKey: string, days: number): string {
  const noonUtc = new Date(`${dayKey}T12:00:00Z`);
  noonUtc.setUTCDate(noonUtc.getUTCDate() + days);
  return parisDayKey(noonUtc);
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

/**
 * Étiquette de mois positionnée au-dessus de la grille heatmap. Une seule
 * entrée par mois rencontré, calée sur la 1re colonne où ce mois apparaît.
 */
export type HeatmapMonthLabel = {
  colIndex: number;
  /** "mai", "juin"… abrégé pour entrer au-dessus d'une colonne étroite. */
  label: string;
};

/**
 * Grille style "GitHub contributions" : N colonnes-semaines (lundi-first)
 * × 7 lignes-jours (L→D). Les jours hors fenêtre [now, now+90j] sont
 * marqués `outOfWindow` pour rendu grisé. La grille démarre toujours sur
 * le lundi de la semaine courante pour aligner le repère "aujourd'hui".
 */
export type AgendaHeatmap = {
  /** `weeks[col][row]` — chaque colonne = 1 semaine, 7 entrées L→D. */
  weeks: DayCell[][];
  monthLabels: HeatmapMonthLabel[];
  /** Total cumulé sur la fenêtre, séparé par mode pour le hero stats. */
  fixedCount: number;
  voteCount: number;
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
 * Construit une grille continue (style GitHub) sur `weekCount` semaines
 * à partir du lundi de la semaine courante. Couvre la fenêtre [now,
 * now+windowDays] : 13 semaines = ~91 jours, suffisant pour 3 mois
 * glissants sans découper en cartes mensuelles séparées.
 */
export function buildAgendaHeatmap(
  now: Date,
  buckets: Map<string, DayBucket>,
  weekCount = 13,
  windowDays = 90
): AgendaHeatmap {
  const todayKey = parisDayKey(now);
  const windowEndKey = parisDayKey(new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000));

  // Lundi de la semaine courante : on remonte de N jours selon le
  // weekday de today (0=lundi, donc shift = 0 si on est lundi).
  const todayWeekday = parisWeekdayMondayFirst(todayKey);
  const startMonday = addDaysToDayKey(todayKey, -todayWeekday);

  const weeks: DayCell[][] = [];
  const monthLabels: HeatmapMonthLabel[] = [];
  let fixedCount = 0;
  let voteCount = 0;
  let prevMonth = "";

  for (let col = 0; col < weekCount; col++) {
    const week: DayCell[] = [];
    for (let row = 0; row < 7; row++) {
      const dayKey = addDaysToDayKey(startMonday, col * 7 + row);
      // Date à midi Paris de la cellule — utilisée pour le formatter de
      // mois (qui re-projette via `timeZone: 'Europe/Paris'` donc l'offset
      // littéral ici importe peu).
      const date = new Date(`${dayKey}T12:00:00+02:00`);
      const cell: DayCell = {
        dayKey,
        date,
        dayOfMonth: Number(dayKey.slice(8, 10)),
        outOfWindow: dayKey < todayKey || dayKey > windowEndKey,
        isToday: dayKey === todayKey,
      };
      week.push(cell);

      if (!cell.outOfWindow) {
        const bucket = buckets.get(dayKey);
        if (bucket) {
          fixedCount += bucket.fixed.length;
          voteCount += bucket.vote.length;
        }
      }
    }
    weeks.push(week);

    // Label du mois : 1re colonne où apparaît un nouveau mois (on prend
    // le 1er jour de la colonne qui change de mois — typiquement la
    // colonne contenant le 1er du mois). On évite les doublons via
    // `prevMonth` pour qu'un mois traversant 4 colonnes ne s'étiquette
    // qu'une fois. On saute le mois résiduel hors fenêtre (typiquement
    // le mois de la 1re semaine quand today est en début de mois) :
    // pas de label pour des jours grisés inaccessibles, ça libère la
    // place visuelle pour le 1er vrai mois de la fenêtre.
    for (const cell of week) {
      const monthYear = cell.dayKey.slice(0, 7);
      if (monthYear !== prevMonth) {
        if (!cell.outOfWindow) {
          monthLabels.push({
            colIndex: col,
            label: shortMonthFormatter.format(cell.date).replace(".", ""),
          });
        }
        prevMonth = monthYear;
        break;
      }
    }
  }

  return { weeks, monthLabels, fixedCount, voteCount };
}
