/**
 * Fonctions utilitaires pour tracker les événements A/B test des landing pages
 * Support: Umami, Google Analytics, Plausible
 */

/**
 * Track un clic sur le CTA d'une landing page
 */
export function trackLandingCTA() {
  if (typeof window === "undefined") return;

  const variant = localStorage.getItem("landing_variant");

  // Umami Analytics (recommandé - gratuit)
  if ((window as any).umami) {
    (window as any).umami.track("cta-click", { variant });
  }

  // Google Analytics (fallback)
  if ((window as any).gtag) {
    (window as any).gtag("event", "cta_click", {
      landing_variant: variant,
      event_category: "landing_page",
      event_label: variant,
    });
  }

  // Plausible Analytics (fallback)
  if ((window as any).plausible) {
    (window as any).plausible("CTA Click", {
      props: { variant },
    });
  }

  // Console log pour debug
  console.log("[A/B Test] CTA clicked - Variant:", variant);
}

/**
 * Track une conversion (inscription réussie)
 */
export function trackLandingConversion() {
  if (typeof window === "undefined") return;

  const variant = localStorage.getItem("landing_variant");

  // Umami Analytics (recommandé - gratuit)
  if ((window as any).umami) {
    (window as any).umami.track("conversion", { variant });
  }

  // Google Analytics (fallback)
  if ((window as any).gtag) {
    (window as any).gtag("event", "conversion", {
      landing_variant: variant,
      event_category: "landing_page",
      event_label: variant,
      value: 1,
    });
  }

  // Plausible Analytics (fallback)
  if ((window as any).plausible) {
    (window as any).plausible("Conversion", {
      props: { variant },
    });
  }

  // Console log pour debug
  console.log("[A/B Test] Conversion - Variant:", variant);
}
