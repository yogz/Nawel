// Buckets temporels pour la home : groupe les sorties à venir par horizon
// (cette semaine / ce mois-ci / plus tard / date à voter) afin que la
// liste ne soit pas un mur chronologique opaque dès qu'on dépasse 5-6
// événements. Les seuils sont en distance (jours depuis maintenant)
// plutôt qu'en bornes calendaires : c'est plus fidèle à la perception
// utilisateur ("ce mois-ci" = "dans les ~30 prochains jours") et ça évite
// les buckets fantômes en fin de mois.
//
// `undated` accueille les sorties en mode vote dont la date n'est pas
// encore arrêtée — si on les mélangeait avec les datées on les ferait
// remonter ou descendre arbitrairement selon la valeur null.

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

type Datable = { startsAt: Date | null };

export type UpcomingBucketKey = "this-week" | "this-month" | "later" | "undated";

export type UpcomingBucket<T extends Datable> = {
  key: UpcomingBucketKey;
  label: string;
  outings: T[];
};

/**
 * Partitionne une liste de sorties à venir en 4 buckets temporels et
 * renvoie les buckets dans l'ordre d'affichage (du plus proche au plus
 * lointain, "date à voter" tout à la fin). Les buckets vides sont
 * conservés dans le retour — au caller de filtrer s'il ne veut pas
 * rendre de header pour rien.
 *
 * Suppose que `outings` est déjà filtré sur "à venir" (startsAt >= now
 * ou null). Ne re-trie pas en interne : à l'appelant de garantir un
 * ordre par `startsAt` asc avant l'appel pour que chaque bucket soit
 * lui-même chronologique.
 */
export function bucketizeUpcoming<T extends Datable>(
  outings: T[],
  now: Date = new Date()
): UpcomingBucket<T>[] {
  const nowMs = now.getTime();
  const thisWeek: T[] = [];
  const thisMonth: T[] = [];
  const later: T[] = [];
  const undated: T[] = [];

  for (const o of outings) {
    if (!o.startsAt) {
      undated.push(o);
      continue;
    }
    const deltaMs = o.startsAt.getTime() - nowMs;
    if (deltaMs <= SEVEN_DAYS_MS) {
      thisWeek.push(o);
    } else if (deltaMs <= THIRTY_DAYS_MS) {
      thisMonth.push(o);
    } else {
      later.push(o);
    }
  }

  return [
    { key: "this-week", label: "cette semaine", outings: thisWeek },
    { key: "this-month", label: "ce mois-ci", outings: thisMonth },
    { key: "later", label: "plus tard", outings: later },
    { key: "undated", label: "date à voter", outings: undated },
  ];
}

/**
 * Trie ascendant par `startsAt`, en plaçant les sorties sans date arrêtée
 * (mode vote en attente) à la fin. Conserve l'ordre relatif des entrées
 * sans date (tri stable côté V8/SpiderMonkey depuis ES2019).
 */
export function sortUpcomingByStartsAt<T extends Datable>(outings: T[]): T[] {
  return [...outings].sort((a, b) => {
    if (!a.startsAt && !b.startsAt) {
      return 0;
    }
    if (!a.startsAt) {
      return 1;
    }
    if (!b.startsAt) {
      return -1;
    }
    return a.startsAt.getTime() - b.startsAt.getTime();
  });
}
