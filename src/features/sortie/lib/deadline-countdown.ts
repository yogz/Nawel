/**
 * Compteur "temps restant avant fermeture des inscriptions" affiché
 * sur les cartes de sortie (page profil, home, etc.). Quatre tons
 * pour signaler l'urgence sans calls-to-action séparés :
 *
 *   - `closed`   : deadline passée → message gris non-urgent
 *   - `urgent`   : < 24 h → "Plus que 18h" en rouge hot, attire l'œil
 *   - `soon`     : 1–7 jours → "J-3" en or, signal de proximité
 *   - `neutral`  : ≥ 7 jours → "Réponds avant le 30 avril" en gris
 *
 * Toutes les sorties affichent une chip — uniforme pour le scan.
 * On ne pousse l'urgence visuelle qu'à partir de J-1 / 24h pour ne
 * pas crier au feu en permanence (un compteur "Plus que 5 jours" en
 * rouge banalise la couleur quand vraiment 18h restent).
 */

export type DeadlineTone = "neutral" | "soon" | "urgent" | "closed";

export type DeadlineCountdown = {
  label: string;
  tone: DeadlineTone;
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

const dayMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

export function formatDeadlineCountdown(
  deadlineAt: Date,
  now: Date = new Date()
): DeadlineCountdown {
  const deltaMs = deadlineAt.getTime() - now.getTime();

  if (deltaMs <= 0) {
    return { label: "Réponses closes", tone: "closed" };
  }

  if (deltaMs < ONE_DAY_MS) {
    // Round up so "23h59 restants" lit comme "Plus que 24h" plutôt
    // que "Plus que 23h" (sentiment d'urgence cohérent avec ce qu'un
    // humain dit). Floor-ceil entre 1 et 24 selon ce qui reste.
    // Suffixe "pour répondre" : sans contexte explicite, "Plus que 18h"
    // pourrait être lu comme "il reste 18h avant la sortie" alors
    // que c'est la deadline RSVP. Le suffixe lève l'ambiguïté.
    const hoursLeft = Math.max(1, Math.ceil(deltaMs / ONE_HOUR_MS));
    return {
      label: hoursLeft === 1 ? "Plus que 1h pour répondre" : `Plus que ${hoursLeft}h pour répondre`,
      tone: "urgent",
    };
  }

  if (deltaMs < SEVEN_DAYS_MS) {
    // 1–7 jours : "J-4 pour répondre" — le J-N seul était ambigu
    // (référence à la sortie ou à la deadline RSVP ?), le suffixe
    // précise. Reste compact pour la chip mono uppercase.
    const daysLeft = Math.ceil(deltaMs / ONE_DAY_MS);
    return { label: `J-${daysLeft} pour répondre`, tone: "soon" };
  }

  // ≥ 7 jours : on revient à l'absolu, parce que "Plus que 12 jours"
  // n'a pas le même signal que "Plus que 12h" — quand on a une
  // semaine ou plus, le format "31 décembre" est plus actionnable
  // (l'utilisateur planifie en date, pas en compte à rebours).
  return {
    label: `Réponds avant le ${dayMonthFormatter.format(deadlineAt)}`,
    tone: "neutral",
  };
}
