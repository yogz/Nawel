"use client";

import { useEffect, useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";

type LandingVariant = "landing" | "landing-alt";

export function useLandingVariant() {
  const [variant, setVariant] = useState<LandingVariant | null>(null);

  useEffect(() => {
    const savedVariant = localStorage.getItem("landing-variant") as LandingVariant | null;

    if (savedVariant && (savedVariant === "landing" || savedVariant === "landing-alt")) {
      setVariant(savedVariant);
    } else {
      const newVariant: LandingVariant = Math.random() < 0.5 ? "landing" : "landing-alt";
      localStorage.setItem("landing-variant", newVariant);
      setVariant(newVariant);

      // Track the assignment in GA4
      sendGAEvent("event", "landing_variant_assigned", {
        variant: newVariant,
      });
    }
  }, []);

  return variant;
}
