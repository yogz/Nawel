/**
 * Préférences RSVP anonymes persistées dans localStorage. Quand un
 * visiteur sans compte logué RSVP sur une sortie, on retient son
 * `name` / `email` / `extraAdults` / `extraChildren` localement pour
 * pré-remplir les sheets sur les sorties suivantes — il n'a plus à
 * re-saisir les mêmes infos à chaque RSVP.
 *
 * Origin-scoped : seul `sortie.colist.fr` peut lire/écrire (sécurité
 * navigateur native), donc pas de fuite vers Colist www. La donnée
 * reste sur l'appareil de l'utilisateur.
 *
 * Pas concurrent avec le compte silent qui se crée côté serveur quand
 * un email est fourni : localStorage est un cache de saisie rapide,
 * la DB est la source de vérité. Le compte logué prime toujours sur
 * ces prefs (on ne lit prefs que si `loggedInName` est absent).
 */

const STORAGE_KEY = "sortie:anon-rsvp-prefs";

export type AnonRsvpPrefs = {
  name: string;
  email: string;
  extraAdults: number;
  extraChildren: number;
};

/**
 * Lit les préférences depuis localStorage. Retourne `null` côté SSR
 * ou si le storage est vide / corrompu.
 */
export function readAnonPrefs(): AnonRsvpPrefs | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const p = parsed as Record<string, unknown>;
    const name = typeof p.name === "string" ? p.name.slice(0, 100) : "";
    const email = typeof p.email === "string" ? p.email.slice(0, 255) : "";
    const extraAdults =
      typeof p.extraAdults === "number" && p.extraAdults >= 0 && p.extraAdults <= 10
        ? Math.floor(p.extraAdults)
        : 0;
    const extraChildren =
      typeof p.extraChildren === "number" && p.extraChildren >= 0 && p.extraChildren <= 10
        ? Math.floor(p.extraChildren)
        : 0;
    if (!name && !email && !extraAdults && !extraChildren) {
      return null;
    }
    return { name, email, extraAdults, extraChildren };
  } catch {
    return null;
  }
}

/**
 * Merge partial prefs with what's already stored. Permet d'appeler
 * `writeAnonPrefs({ name: "Léa" })` sans écraser l'email déjà connu.
 */
export function writeAnonPrefs(partial: Partial<AnonRsvpPrefs>): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const current = readAnonPrefs() ?? {
      name: "",
      email: "",
      extraAdults: 0,
      extraChildren: 0,
    };
    const merged: AnonRsvpPrefs = {
      name: partial.name !== undefined ? partial.name.slice(0, 100) : current.name,
      email: partial.email !== undefined ? partial.email.slice(0, 255) : current.email,
      extraAdults:
        partial.extraAdults !== undefined
          ? Math.max(0, Math.min(10, Math.floor(partial.extraAdults)))
          : current.extraAdults,
      extraChildren:
        partial.extraChildren !== undefined
          ? Math.max(0, Math.min(10, Math.floor(partial.extraChildren)))
          : current.extraChildren,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Quota dépassé ou storage désactivé — silent fail, la fonction
    // est best-effort.
  }
}
