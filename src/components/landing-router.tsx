"use client";

import { useLandingVariant } from "@/hooks/use-landing-variant";
import { Landing } from "@/components/landing";
import { LandingAlt } from "@/components/landing-alt";

export function LandingRouter() {
  const variant = useLandingVariant();

  // Afficher un écran vide pendant le chargement pour éviter le flash
  if (!variant) {
    return <div className="min-h-screen bg-white" />;
  }

  // A/B test entre Landing et LandingAlt (par défaut 'landing')
  return variant === "landing-alt" ? <LandingAlt /> : <Landing />;
}
