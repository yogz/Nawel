/**
 * Pluralisation FR simple : ajoute "s" au pluriel par défaut, ou utilise
 * une forme explicite (irréguliers, terminaisons en x). Exclusivement
 * pour des labels UI / strings d'emails — pas pour de l'i18n complète.
 */
export function plural(n: number, sing: string, plur = sing + "s"): string {
  return n > 1 ? plur : sing;
}
