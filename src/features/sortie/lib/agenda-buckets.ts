import { parisDayKey } from "@/features/sortie/lib/date-fr";
import { jLabel } from "@/features/sortie/lib/relative-date";
import { bucketizeUpcoming, type UpcomingBucketKey } from "@/features/sortie/lib/upcoming-buckets";
import type { EyebrowTone } from "@/features/sortie/components/eyebrow";

/**
 * Bucketing de l'agenda — réutilise `bucketizeUpcoming` (sémantique
 * rolling 7/30 jours, choix produit déjà documenté côté home) et
 * ajoute juste un bucket `today` en tête : la chronologie agenda a
 * besoin d'isoler le jour courant (le marqueur "↓ aujourd'hui" et le
 * tone acid s'y accrochent).
 */

export type AgendaBucket = "today" | UpcomingBucketKey;

export type AgendaGroup<T> = { bucket: AgendaBucket; items: T[] };

export const BUCKET_LABEL: Record<AgendaBucket, string> = {
  today: "aujourd'hui",
  "this-week": "cette semaine",
  "this-month": "ce mois-ci",
  later: "plus tard",
  undated: "à programmer",
};

export const BUCKET_TONE: Record<AgendaBucket, EyebrowTone> = {
  today: "acid",
  "this-week": "muted",
  "this-month": "muted",
  later: "muted",
  undated: "hot",
};

export const BUCKET_ORDER: AgendaBucket[] = [
  "today",
  "this-week",
  "this-month",
  "later",
  "undated",
];

type Datable = { startsAt: Date | null };

/**
 * Range et groupe les sorties à venir. Ne renvoie que les buckets
 * non-vides. Le bucket `today` est extrait de `this-week` par
 * comparaison de jour calendaire Paris (DST-safe via `parisDayKey`).
 */
export function groupAgendaOutings<T extends Datable>(
  outings: T[],
  now: Date = new Date()
): AgendaGroup<T>[] {
  const todayKey = parisDayKey(now);
  const baseBuckets = bucketizeUpcoming(outings, now);
  const grouped = new Map<AgendaBucket, T[]>();

  for (const bucket of baseBuckets) {
    if (bucket.outings.length === 0) {
      continue;
    }
    if (bucket.key === "this-week") {
      const today: T[] = [];
      const rest: T[] = [];
      for (const item of bucket.outings) {
        if (item.startsAt && parisDayKey(item.startsAt) === todayKey) {
          today.push(item);
        } else {
          rest.push(item);
        }
      }
      if (today.length > 0) {
        grouped.set("today", today);
      }
      if (rest.length > 0) {
        grouped.set("this-week", rest);
      }
    } else {
      grouped.set(bucket.key, bucket.outings);
    }
  }

  return BUCKET_ORDER.filter((b) => (grouped.get(b)?.length ?? 0) > 0).map((bucket) => ({
    bucket,
    items: grouped.get(bucket)!,
  }));
}

/**
 * Nombre de jours pleins entre `now` et `startsAt` en calendrier Paris.
 * Compte les jours calendaires (pas les 24h glissantes) pour rester
 * cohérent avec `jLabel` ("demain" = 1 même si la sortie est dans 4h
 * le lendemain).
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
