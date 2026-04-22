/**
 * Integers under 20 are spelled out in French as body copy ("Huit d'entre
 * vous…"). 20 and above become digits — the transition point matches the
 * tone-of-voice rules set by the frontend-design review.
 */

const WORDS = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
] as const;

export function numberToFrench(n: number): string {
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return String(n);
  }
  if (n < WORDS.length) {
    return WORDS[n];
  }
  return String(n);
}

/**
 * Capitalised first letter — useful at the start of a sentence:
 *   "Huit d'entre vous ont déjà dit oui."
 */
export function numberToFrenchCap(n: number): string {
  const w = numberToFrench(n);
  return w.charAt(0).toUpperCase() + w.slice(1);
}
