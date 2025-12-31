"use client";

import { useLandingVariant } from "@/hooks/use-landing-variant";
import { Landing } from "@/components/landing";
import { LandingAlt } from "@/components/landing-alt";

export function LandingRouter() {
  const variant = useLandingVariant();

  // Afficher un écran vide pendant le chargement pour éviter le flash
  if (!variant) {
    // On pourrait ajouter un skeleton ici, mais pour l'instant on évite le flash blanc
    // en restant sur le fond par défaut ou en attendant PostHog.
    // Cependant, pour éviter le blocage permanent si PostHog échoue,
    // l'effet dans useLandingVariant devrait idéalement avoir un timeout.
    return <div className="min-h-screen bg-white" />;
  }

  // A/B test entre Landing et LandingAlt (par défaut 'landing' si PostHog n'est pas prêt après un court délai)
  return variant === "landing-alt" ? <LandingAlt /> : <Landing />;
}
