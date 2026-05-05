"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { setUmamiUserId } from "@/lib/umami";

/**
 * Identifie l'utilisateur Better Auth dans Umami pour permettre les
 * cohortes (rétention, K-factor par user). Calque sur le composant
 * `AnalyticsSessionSync` côté CoList, mais importe `setUmamiUserId`
 * direct depuis `@/lib/umami` plutôt que via `@/lib/analytics`
 * (legacy CoList) pour découpler les 2 piles : Sortie ne doit pas
 * dépendre du namespace analytics historique.
 *
 * Mounté dans `(sortie)/layout.tsx`. Si Umami n'est pas encore chargé
 * au 1ᵉʳ effect (script `afterInteractive`), `setUmamiUserId` ignore
 * silencieusement ; le `useSession` resync au render suivant.
 */
export function SortieAnalyticsSessionSync() {
  const { data: session } = useSession();

  useEffect(() => {
    setUmamiUserId(session?.user?.id ?? null);
  }, [session?.user?.id]);

  return null;
}
