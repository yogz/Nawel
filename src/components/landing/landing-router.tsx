"use client";

import { useLandingVariant } from "@/hooks/use-landing-variant";
import { LandingVariantB } from "./landing-variant-b";
import { LandingVariantC } from "./landing-variant-c";

export function LandingRouter() {
  const variant = useLandingVariant();

  // Afficher un écran vide pendant le chargement pour éviter le flash
  if (!variant) {
    return <div className="min-h-screen bg-white" />;
  }

  // Uniquement rotation entre B et C
  return variant === "landing-c" ? <LandingVariantC /> : <LandingVariantB />;
}
