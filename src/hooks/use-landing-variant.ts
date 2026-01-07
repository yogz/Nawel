"use client";

import { useSyncExternalStore } from "react";
import { sendGAEvent } from "@next/third-parties/google";

type LandingVariant = "landing" | "landing-alt";

const STORAGE_KEY = "landing-variant";

function getSnapshot(): LandingVariant | null {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "landing" || saved === "landing-alt") {
    return saved;
  }

  // Assign new variant
  const newVariant: LandingVariant = Math.random() < 0.5 ? "landing" : "landing-alt";
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
