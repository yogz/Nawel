/**
 * Fonctions utilitaires pour tracker les événements A/B test des landing pages
 * Tracking via PostHog
 */

import posthog from "posthog-js";

/**
 * Track un clic sur le CTA d'une landing page
 */
export function trackLandingCTA() {
  if (typeof window === "undefined") {
    return;
  }

  // Récupérer la variante depuis PostHog
  const flagVariant = posthog.getFeatureFlag("landing-page-variant");
  const variant = flagVariant === "test" ? "landing-alt" : "landing";

  // PostHog tracking
  posthog.capture("landing_cta_click", {
    variant,
    feature_flag_variant: flagVariant,
    $set: { landing_variant: variant },
  });

  // Console log pour debug
  console.log("[A/B Test] CTA clicked - Variant:", variant, "Flag:", flagVariant);
}

/**
 * Track une conversion (inscription réussie)
 */
export function trackLandingConversion() {
  if (typeof window === "undefined") {
    return;
  }

  // Récupérer la variante depuis PostHog
  const flagVariant = posthog.getFeatureFlag("landing-page-variant");
  const variant = flagVariant === "test" ? "landing-alt" : "landing";

  // PostHog tracking
  posthog.capture("landing_conversion", {
    variant,
    feature_flag_variant: flagVariant,
    $set: { landing_variant: variant },
  });

  // Console log pour debug
  console.log("[A/B Test] Conversion - Variant:", variant, "Flag:", flagVariant);
}
