"use client";

import { useEffect } from "react";
import { trackOutingViewed } from "@/features/sortie/lib/outing-telemetry";

type Props = {
  mode: "fixed" | "vote";
  isCreator: boolean;
  isLoggedIn: boolean;
  hasResponded: boolean;
};

/**
 * Émet `outing_viewed` au montage de la page sortie publique. Composant
 * client minimal pour ne pas pousser tout le tracking dans la page server.
 *
 * `source` est dérivé de `document.referrer` au moment de l'effect :
 *   - share    — referrer hors-domaine (lien partagé via WhatsApp,
 *                Messenger, mail, etc.). Inclut aussi les apps qui
 *                n'envoient pas de referrer (`""`) car c'est le pattern
 *                d'arrivée par lien collé.
 *   - internal — referrer interne sortie.colist.fr (navigation depuis
 *                la home / une autre sortie / le wizard).
 *   - direct   — historique impossible à trancher → tagué pareil que
 *                share (pas de differenciation utile).
 */
export function OutingViewTracker({ mode, isCreator, isLoggedIn, hasResponded }: Props) {
  useEffect(() => {
    let source: "share" | "internal" | "direct" = "share";
    try {
      const ref = document.referrer;
      if (ref) {
        const refUrl = new URL(ref);
        if (refUrl.hostname === window.location.hostname) {
          source = "internal";
        }
      }
    } catch {
      // URL parsing can fail on weird referrers (intent://, file://...)
      // — on garde "share" par défaut.
    }
    trackOutingViewed({ mode, isCreator, isLoggedIn, hasResponded, source });
    // Dépendances figées au mount : on ne veut pas re-tracker si une prop
    // change après hydratation (ex. RSVP juste fait → hasResponded passe
    // à true). Un view = un mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
