import { parisDayKey } from "./date-fr";

/**
 * Ordre du sélecteur de sortie de l'outil admin « Assignations ». Une
 * liste unique triée par date de création mélangeait passé et futur, et
 * un mauvais clic visait une sortie voisine (incident 2026-10-27 : un +1
 * écrasé sur TEDDY SWIMS au lieu d'ajouter l'invité sur Pilote).
 *
 *   - `upcoming` : sondages sans date en tête, puis sorties datées à
 *     partir d'aujourd'hui (Paris), la plus proche d'abord.
 *   - `past` : le reste, la plus récente d'abord — gardées pour les
 *     rattrapages après coup (remboursements).
 */
export function groupAssignOutings<T extends { fixedDatetime: Date | null }>(
  outings: T[],
  now: Date = new Date()
): { upcoming: T[]; past: T[] } {
  const today = parisDayKey(now);
  const polls = outings.filter((o) => o.fixedDatetime === null);
  const dated = outings.filter((o): o is T & { fixedDatetime: Date } => o.fixedDatetime !== null);
  const upcoming = dated
    .filter((o) => parisDayKey(o.fixedDatetime) >= today)
    .sort((a, b) => a.fixedDatetime.getTime() - b.fixedDatetime.getTime());
  const past = dated
    .filter((o) => parisDayKey(o.fixedDatetime) < today)
    .sort((a, b) => b.fixedDatetime.getTime() - a.fixedDatetime.getTime());
  return { upcoming: [...polls, ...upcoming], past };
}
