"use client";

import { useLandingVariant } from "@/hooks/use-landing-variant";
import { LandingDefault } from "./landing-default";
import { LandingVariantB } from "./landing-variant-b";
import { LandingVariantC } from "./landing-variant-c";

export function LandingRouter() {
  const variant = useLandingVariant();

  // Afficher un écran vide pendant le chargement pour éviter le flash
  if (!variant) {
    return <div className="min-h-screen bg-white" />;
  }

  if (variant === "landing-c") {
    return <LandingVariantC />;
  }

  // A/B test entre Landing et LandingAlt (par défaut 'landing')
  return variant === "landing-alt" ? <LandingVariantB /> : <LandingDefault />;
}
