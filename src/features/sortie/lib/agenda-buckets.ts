import { parisDayKey } from "@/features/sortie/lib/date-fr";
import { jLabel } from "@/features/sortie/lib/relative-date";
import type { EyebrowTone } from "@/features/sortie/components/eyebrow";

/**
 * Bucketing chronologique de l'agenda par semaine ISO calendaire Paris.
 *
 *   today        → bucket isolé pour les sorties du jour courant
 *   week:<key>   → un bucket par semaine ISO qui contient ≥1 sortie
 *                  (les semaines vides sont skip — gaps matérialisés
 *                  par les graduations de mois côté UI)
 *   tbd          → mode vote sans `startsAt` (en bas, séparé)
 *
 * Le delta vers la semaine courante / la semaine suivante est calculé
 * pour permettre le label humain ("cette semaine", "semaine prochaine",
 * "sem du 12 mai"). `parisMonthKey` du lundi sert à la graduation.
 */

const TZ = "Europe/Paris";

const parisWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
});

const parisMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  month: "long",
});

const parisShortDayMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  day: "numeric",
  month: "long",
});

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 0,
};

function parisWeekday(date: Date): number {
  return WEEKDAY_INDEX[parisWeekdayFormatter.format(date)] ?? 0;
}

/**
 * Date du lundi (00:00 UTC convention) de la semaine ISO contenant
 * `date` en calendrier Paris. On passe par `parisDayKey` puis on
 * construit la date à 12:00Z pour éviter qu'un offset DST ne fasse
 * basculer le calcul d'un jour.
 */
function mondayOfWeek(date: Date): Date {
  const dayKey = parisDayKey(date);
  const weekday = parisWeekday(date);
  const diff = weekday === 0 ? -6 : 1 - weekday;
  const ms = Date.parse(`${dayKey}T12:00:00Z`) + diff * 86_400_000;
  const mondayKey = parisDayKey(new Date(ms));
  // Re-création à 00:00Z du jour clé pour avoir un Date stable.
  return new Date(`${mondayKey}T00:00:00Z`);
}

function parisMonthKey(date: Date): string {
  // "MMMM YYYY" — clé d'identité mois Paris pour comparer les graduations.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export type AgendaBucket =
  | { kind: "today" }
  | { kind: "week"; mondayDate: Date; mondayKey: string; weeksFromNow: number }
  | { kind: "tbd" };

export type AgendaGroup<T> = {
  bucket: AgendaBucket;
  items: T[];
  /** Label de mois ("juin", "septembre") à afficher comme graduation
   * AU-DESSUS de ce groupe — quand le mois change vs le groupe
   * précédent. `null` si pas de graduation à dessiner ici. */
  monthGraduation: string | null;
  /** Total de sorties dans ce mois (utilisé pour le compteur posé
   * à côté du label de graduation). `null` quand `monthGraduation`
   * l'est aussi — un seul groupe par mois porte la somme. */
  monthTotal: number | null;
};

type Datable = { startsAt: Date | null };

/**
 * Range et groupe les sorties par semaine ISO Paris.
 *
 * Pré-condition : `outings` triée par `startsAt` ASC NULLS LAST
 * (garantit la query `listMyUpcomingForAgenda`). Sinon les buckets
 * `week` ne seraient pas en ordre chronologique.
 */
export function groupAgendaOutings<T extends Datable>(
  outings: T[],
  now: Date = new Date()
): AgendaGroup<T>[] {
  const todayKey = parisDayKey(now);
  const currentMondayMs = mondayOfWeek(now).getTime();

  const today: T[] = [];
  const weeksMap = new Map<string, { mondayDate: Date; items: T[] }>();
  const tbd: T[] = [];

  for (const outing of outings) {
    if (!outing.startsAt) {
      tbd.push(outing);
      continue;
    }
    if (parisDayKey(outing.startsAt) === todayKey) {
      today.push(outing);
      continue;
    }
    const monday = mondayOfWeek(outing.startsAt);
    const mondayKey = parisDayKey(monday);
    const slot = weeksMap.get(mondayKey);
    if (slot) {
      slot.items.push(outing);
    } else {
      weeksMap.set(mondayKey, { mondayDate: monday, items: [outing] });
    }
  }

  // 1) Construit la liste finale des groups dans l'ordre d'affichage.
  const ordered: AgendaGroup<T>[] = [];
  if (today.length > 0) {
    ordered.push({
      bucket: { kind: "today" },
      items: today,
      monthGraduation: null,
      monthTotal: null,
    });
  }
  for (const key of [...weeksMap.keys()].sort()) {
    const slot = weeksMap.get(key)!;
    const weeksFromNow = Math.round(
      (slot.mondayDate.getTime() - currentMondayMs) / (7 * 86_400_000)
    );
    ordered.push({
      bucket: { kind: "week", mondayDate: slot.mondayDate, mondayKey: key, weeksFromNow },
      items: slot.items,
      monthGraduation: null,
      monthTotal: null,
    });
  }
  if (tbd.length > 0) {
    ordered.push({
      bucket: { kind: "tbd" },
      items: tbd,
      monthGraduation: null,
      monthTotal: null,
    });
  }

  // 2) Passe de graduations. Pour un bucket week, on prend le mois du
  // *dernier* item ; pour today, le mois calendaire de `now`. `tbd`
  // n'a pas de mois et ne participe pas à la chaîne.
  // En même temps, on accumule `monthTotal` : compteur d'items
  // appartenant au même mois successif, posé sur le groupe qui
  // *ouvre* le mois (i.e. celui qui porte la graduation, ou le
  // premier groupe si pas de graduation amont).
  let prevMonthKey: string | null = null;
  let monthOpener: AgendaGroup<T> | null = null;
  let monthRunningTotal = 0;
  for (const group of ordered) {
    let currentDate: Date | null = null;
    if (group.bucket.kind === "today") {
      currentDate = now;
    } else if (group.bucket.kind === "week") {
      const lastItem = group.items[group.items.length - 1];
      currentDate = lastItem?.startsAt ?? group.bucket.mondayDate;
    }
    if (!currentDate) {
      continue;
    }
    const monthKey = parisMonthKey(currentDate);
    if (prevMonthKey === null) {
      monthOpener = group;
      monthRunningTotal = group.items.length;
    } else if (monthKey !== prevMonthKey) {
      // On clôt le mois précédent — `monthTotal` n'est posé QUE si le
      // mois était introduit par une graduation. Le premier mois de la
      // page n'en a pas (sa somme se lit dans le compteur global du H1).
      if (monthOpener && monthOpener.monthGraduation !== null) {
        monthOpener.monthTotal = monthRunningTotal;
      }
      group.monthGraduation = parisMonthFormatter.format(currentDate);
      monthOpener = group;
      monthRunningTotal = group.items.length;
    } else {
      monthRunningTotal += group.items.length;
    }
    prevMonthKey = monthKey;
  }
  if (monthOpener && monthOpener.monthGraduation !== null) {
    monthOpener.monthTotal = monthRunningTotal;
  }

  return ordered;
}

/**
 * Label éditorial pour un bucket. "cette semaine" / "semaine prochaine"
 * pour les semaines proches, sinon "sem du 12 mai" (date du lundi).
 */
export function bucketLabel(bucket: AgendaBucket): string {
  if (bucket.kind === "today") {
    return "aujourd'hui";
  }
  if (bucket.kind === "tbd") {
    return "à programmer";
  }
  if (bucket.weeksFromNow === 0) {
    return "cette semaine";
  }
  if (bucket.weeksFromNow === 1) {
    return "semaine prochaine";
  }
  return `sem du ${parisShortDayMonthFormatter.format(bucket.mondayDate)}`;
}

export function bucketTone(bucket: AgendaBucket): EyebrowTone {
  if (bucket.kind === "today") {
    return "acid";
  }
  if (bucket.kind === "tbd") {
    return "hot";
  }
  return "muted";
}

export function bucketKey(bucket: AgendaBucket): string {
  if (bucket.kind === "today") {
    return "today";
  }
  if (bucket.kind === "tbd") {
    return "tbd";
  }
  return `week:${bucket.mondayKey}`;
}

/**
 * Nombre de jours pleins entre `now` et `startsAt` en calendrier Paris.
 * Compte les jours calendaires (pas les 24h glissantes) pour rester
 * cohérent avec `jLabel`.
 */
export function daysUntilParis(startsAt: Date | null, now: Date): number | null {
  if (!startsAt) {
    return null;
  }
  const startMs = Date.parse(`${parisDayKey(startsAt)}T00:00:00Z`);
  const nowMs = Date.parse(`${parisDayKey(now)}T00:00:00Z`);
  return Math.round((startMs - nowMs) / 86_400_000);
}

export { jLabel };
