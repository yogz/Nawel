/**
 * Compteur "temps restant avant fermeture des inscriptions" affiché
 * sur les cartes de sortie (page profil, home, etc.). Quatre tons
 * pour signaler l'urgence sans calls-to-action séparés :
 *
 *   - `closed`   : deadline passée → message gris non-urgent
 *   - `urgent`   : < 24 h → "Plus que 18h" en rouge hot, attire l'œil
 *   - `soon`     : 1–3 jours → "J-3 pour répondre" en rose, signal d'urgence
 *   - `neutral`  : ≥ 4 jours → "J-5 pour répondre" / "Réponds avant le X" en gris
 *
 * Toutes les sorties affichent une chip — uniforme pour le scan.
 * On ne pousse le rose qu'à partir de J-3 pour ne pas crier au feu en
 * permanence : un "J-5" / "J-12" en rose banalisait la couleur dans un
 * produit "entre potes" et sonnait anxiogène hors contexte d'urgence.
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
    // 1–7 jours : "J-N pour répondre" — le J-N seul était ambigu
    // (référence à la sortie ou à la deadline RSVP ?), le suffixe
    // précise. Reste compact pour la chip mono uppercase.
    //
    // Tone : rose réservé à J-3 max (signal d'urgence vraie). J-4 à
    // J-7 reste informatif mais en gris neutre — sinon la couleur
    // urgence est banalisée et sonne anxiogène pour un produit "entre
    // potes" où la deadline n'est pas critique sept jours en avance.
    const daysLeft = Math.ceil(deltaMs / ONE_DAY_MS);
    return {
      label: `J-${daysLeft} pour répondre`,
      tone: daysLeft <= 3 ? "soon" : "neutral",
    };
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
