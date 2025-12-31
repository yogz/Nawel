"use client";

import { useEffect, useState } from "react";

type LandingVariant = "landing" | "landing-alt";

export function useLandingVariant() {
  const [variant, setVariant] = useState<LandingVariant | null>(null);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà une variante assignée (localStorage)
    const existingVariant = localStorage.getItem("landing_variant") as LandingVariant;

    if (existingVariant && (existingVariant === "landing" || existingVariant === "landing-alt")) {
      setVariant(existingVariant);
    } else {
      // Assigner aléatoirement une variante (50/50)
      const variants: LandingVariant[] = ["landing", "landing-alt"];
      const randomVariant = variants[Math.floor(Math.random() * variants.length)];

      // Sauvegarder dans localStorage pour persistance
      localStorage.setItem("landing_variant", randomVariant);
      setVariant(randomVariant);

      // Tracker l'assignation de variante
      if (typeof window !== "undefined") {
        // Umami Analytics (recommandé - gratuit)
        if ((window as any).umami) {
          (window as any).umami.track("variant-assigned", {
            variant: randomVariant,
          });
        }

        // Google Analytics
        if ((window as any).gtag) {
          (window as any).gtag("event", "landing_variant_assigned", {
            variant: randomVariant,
          });
        }

        // Plausible Analytics
        if ((window as any).plausible) {
          (window as any).plausible("Variant Assigned", {
            props: { variant: randomVariant },
          });
        }
      }
    }
  }, []);

  return variant;
}
