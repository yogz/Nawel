"use client";

import { useEffect } from "react";
import { sendGAEvent } from "@/lib/umami";
import { LANDING_EVENTS } from "./landing-events";

/**
 * Beacon client minimaliste — émet une pageview au mount pour mesurer
 * la conversion landing. Isolé de LandingV2 (RSC) pour ne pas
 * client-bundle toute la landing à cause d'un seul useEffect.
 */
export function LandingViewBeacon() {
  useEffect(() => {
    sendGAEvent("event", LANDING_EVENTS.view);
  }, []);
  return null;
}
