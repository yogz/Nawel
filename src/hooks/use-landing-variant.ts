"use client";

import { useSyncExternalStore } from "react";
import { sendGAEvent } from "@next/third-parties/google";

type LandingVariant = "landing-alt" | "landing-c";

const STORAGE_KEY = "landing-variant";

function getSnapshot(): LandingVariant | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Allow forcing variant via URL for testing
  const params = new URLSearchParams(window.location.search);
  const forcedVariant = params.get("v");
  if (forcedVariant === "c") return "landing-c";
  if (forcedVariant === "b" || forcedVariant === "a") return "landing-alt";

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "landing-alt" || saved === "landing-c") {
    return saved as LandingVariant;
  }

  // Assign new variant (50/50 split)
  const rand = Math.random();
  const newVariant: LandingVariant = rand > 0.5 ? "landing-c" : "landing-alt";
  localStorage.setItem(STORAGE_KEY, newVariant);

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
