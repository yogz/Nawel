"use client";

import { useSyncExternalStore } from "react";
import { sendGAEvent } from "@next/third-parties/google";

type LandingVariant = "landing" | "landing-alt" | "landing-c";

const STORAGE_KEY = "landing-variant";

function getSnapshot(): LandingVariant | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Allow forcing variant via URL for testing
  const params = new URLSearchParams(window.location.search);
  const forcedVariant = params.get("v");
  if (forcedVariant === "c") return "landing-c";
  if (forcedVariant === "b") return "landing-alt";
  if (forcedVariant === "a") return "landing";

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "landing" || saved === "landing-alt" || saved === "landing-c") {
    return saved as LandingVariant;
  }

  // Assign new variant (33% split)
  const rand = Math.random();
  let newVariant: LandingVariant = "landing";
  if (rand > 0.66) newVariant = "landing-c";
  else if (rand > 0.33) newVariant = "landing-alt";
  localStorage.setItem(STORAGE_KEY, newVariant);

  // Track the assignment in GA4
  sendGAEvent("event", "landing_variant_assigned", {
    variant: newVariant,
  });

  return newVariant;
}

function getServerSnapshot(): LandingVariant | null {
  return null;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useLandingVariant(): LandingVariant | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
