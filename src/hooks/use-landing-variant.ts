"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";

type LandingVariant = "landing" | "landing-alt";

export function useLandingVariant() {
  const [variant, setVariant] = useState<LandingVariant | null>(null);

  useEffect(() => {
    // Attendre que PostHog soit prêt
    if (!posthog.__loaded) {
      posthog.onFeatureFlags(() => {
        const flagVariant = posthog.getFeatureFlag("landing-page-variant");
        // Mapper les variantes PostHog (control/test) vers les noms de landing
        const mappedVariant: LandingVariant = flagVariant === "test" ? "landing-alt" : "landing";
        setVariant(mappedVariant);
        // Tracker l'assignation de variante avec PostHog
        posthog.capture("landing_variant_assigned", {
          variant: mappedVariant,
          feature_flag_variant: flagVariant,
          $set: { landing_variant: mappedVariant },
        });
      });
    } else {
      const flagVariant = posthog.getFeatureFlag("landing-page-variant");
      // Mapper les variantes PostHog (control/test) vers les noms de landing
      const mappedVariant: LandingVariant = flagVariant === "test" ? "landing-alt" : "landing";
      setVariant(mappedVariant);
      // Tracker l'assignation de variante avec PostHog
      posthog.capture("landing_variant_assigned", {
        variant: mappedVariant,
        feature_flag_variant: flagVariant,
        $set: { landing_variant: mappedVariant },
      });
    }

    // Sécurité : si PostHog met trop de temps (ex: adblock), on affiche la landing par défaut
    const timeout = setTimeout(() => {
      setVariant((prev) => prev || "landing");
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  return variant;
}
