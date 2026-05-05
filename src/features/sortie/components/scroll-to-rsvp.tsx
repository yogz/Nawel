"use client";

import { useEffect } from "react";

/**
 * Pour les arrivées via le magic link "nouvelle sortie d'un user que tu
 * suis" (callback URL `?rsvp=auto`), Better Auth a déjà consommé le
 * token et posé la session quand cette page rend. Ce composant scrolle
 * juste vers le bloc RSVP au mount pour que le follower voie le bouton
 * de réponse immédiatement, sans devoir scanner la page. Pas
 * d'auto-clic — l'invité veut probablement voir le contexte (titre,
 * date, lieu) une seconde avant de répondre.
 */
export function ScrollToRsvp({ targetIds }: { targetIds: string[] }) {
  useEffect(() => {
    const el = targetIds.map((id) => document.getElementById(id)).find((node) => node !== null);
    if (!el) {
      return;
    }
    // requestAnimationFrame attend un paint pour que le layout final soit
    // résolu (le flux RSVP est sous des sections lazy-mounted parfois).
    const raf = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(raf);
    // targetIds est stable côté serveur ; le array literal change chaque
    // render mais son contenu reste le même — pas besoin de mémoïser.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIds.join(",")]);

  return null;
}
