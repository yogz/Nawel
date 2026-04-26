"use client";

import { useEffect, useState } from "react";

/**
 * Persistance localStorage du brouillon du wizard `/sortie/nouvelle`.
 *
 * Pourquoi : un coup de fil entrant qui kill la webview, un swipe-up
 * Safari accidentel, une perte de réseau pendant la recherche Gemini —
 * tout ça vidait le wizard. Sur un flow de 6 steps avec parfois une
 * attente de 12-15 s sur Gemini, c'est brutal.
 *
 * Stratégie :
 * - Lecture localStorage UNIQUEMENT en `useEffect` post-mount pour
 *   éviter tout hydration mismatch (pattern recommandé par React.dev).
 * - Clé versionnée `sortie:wizard:v1` pour pouvoir bump sans empoisonner
 *   le storage si on change le shape du brouillon.
 * - TTL 24h : au-delà, le brouillon est considéré périmé et ignoré.
 * - Date sérialisées en ISO local au save / re-instanciées au restore.
 * - Le composant affiche un banner "Brouillon retrouvé" qui propose
 *   "Reprendre" ou "Recommencer" — on n'écrase JAMAIS un draft sans
 *   demander.
 */

const STORAGE_KEY = "sortie:wizard:v1";
const TTL_MS = 24 * 60 * 60 * 1000;

// Shape sérialisable du brouillon. Toutes les Date deviennent des strings
// ISO ; le reste reste tel quel. On accepte n'importe quel shape `unknown`
// au restore et on valide champ par champ.
export type SerializableValue = unknown;

export type WizardDraftSnapshot<TDraft, TStep extends string> = {
  draft: TDraft;
  step: TStep;
  savedAt: number;
};

type StoredEntry = {
  version: 1;
  savedAt: number;
  payload: unknown;
};

/**
 * Sérialise le snapshot. Convertit les Date en ISO strings via le
 * remplaceur JSON (les Date ont déjà un `toJSON()` natif qui produit
 * un ISO UTC — on s'appuie dessus, pas besoin de logique custom).
 */
export function persistWizardDraft<TDraft, TStep extends string>(
  snapshot: WizardDraftSnapshot<TDraft, TStep>
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const entry: StoredEntry = {
      version: 1,
      savedAt: snapshot.savedAt,
      payload: { draft: snapshot.draft, step: snapshot.step },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Storage plein, mode privé Safari, etc. — silencieux : la perte
    // de persistance est un dégradé acceptable.
  }
}

export function clearWizardDraft(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // idem.
  }
}

/**
 * Lit le brouillon stocké si encore valide (TTL 24 h). Retourne null
 * sur miss / parse error / expiré. Les Date ne sont PAS reconverties
 * automatiquement — c'est au caller de re-instancier ce qu'il sait
 * être une Date dans son shape de Draft (typage trop loose ici pour
 * deviner sans risque).
 */
function readStoredEntry(): { savedAt: number; payload: unknown } | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredEntry>;
    if (parsed?.version !== 1 || typeof parsed.savedAt !== "number") {
      return null;
    }
    if (Date.now() - parsed.savedAt > TTL_MS) {
      return null;
    }
    return { savedAt: parsed.savedAt, payload: parsed.payload };
  } catch {
    return null;
  }
}

/**
 * Hook qui expose le brouillon stocké détecté au montage. Le composant
 * appelle `dismiss()` quand l'utilisateur a tranché — soit qu'il
 * reprenne (le composant se charge alors d'appliquer le payload via
 * son propre `setDraft`/`setStep`), soit qu'il recommence (auquel
 * cas le composant appelle aussi `clearWizardDraft()` en plus).
 *
 * Le hook reste agnostique du shape exact du Draft : c'est au caller
 * de valider et reconvertir les Date.
 */
export function useStoredWizardDraft(): {
  /**
   * Null tant que le 1er useEffect post-mount n'a pas tourné, puis
   * soit le payload trouvé, soit `false` si rien à restorer. Permet
   * de distinguer "encore en train de regarder" de "rien trouvé".
   */
  stored: { savedAt: number; payload: unknown } | null | false;
  dismiss: () => void;
} {
  const [stored, setStored] = useState<{ savedAt: number; payload: unknown } | null | false>(null);

  useEffect(() => {
    const entry = readStoredEntry();
    setStored(entry ?? false);
  }, []);

  return {
    stored,
    dismiss: () => setStored(false),
  };
}
