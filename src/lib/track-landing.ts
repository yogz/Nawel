/**
 * Fonctions utilitaires pour tracker les événements A/B test des landing pages
 */

/**
 * Track un clic sur le CTA d'une landing page
 */
export function trackLandingCTA() {
  if (typeof window === "undefined") return;

  const variant = localStorage.getItem("landing_variant");

  // Google Analytics
  if ((window as any).gtag) {
    (window as any).gtag("event", "cta_click", {
      landing_variant: variant,
      event_category: "landing_page",
      event_label: variant,
    });
  }

  // Console log pour debug
  console.log("[A/B Test] CTA clicked - Variant:", variant);
}
