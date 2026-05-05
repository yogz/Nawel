"use client";

/**
 * Détection device-class côté browser pour la propriété custom `device`
 * émise sur les events Umami `wizard_publish_succeeded` et
 * `outing_viewed`. Comble l'angle mort « mobile vs desktop » identifié
 * par les reviews croisées (cf. ANALYTICS_AUDIT.md §9.1) — Umami
 * capture le device au niveau du site mais pas par event.
 *
 * Stratégie : `matchMedia` sur les breakpoints standards (640px / 1024px).
 * Aligne sur les breakpoints Tailwind `sm` / `lg` que l'app utilise déjà.
 * En SSR (`window` undef), retourne "desktop" comme fallback safe :
 * un label par défaut vaut mieux qu'un event sans la propriété.
 */
export function getDeviceLabel(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") {
    return "desktop";
  }
  try {
    if (window.matchMedia("(max-width: 639px)").matches) {
      return "mobile";
    }
    if (window.matchMedia("(max-width: 1023px)").matches) {
      return "tablet";
    }
    return "desktop";
  } catch {
    return "desktop";
  }
}
