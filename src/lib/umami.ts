"use client";

type UmamiEventData = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: UmamiEventData) => void;
      identify: (id: string, data?: UmamiEventData) => void;
    };
  }
}

const IS_DEV = process.env.NODE_ENV === "development";

export function sendGAEvent(
  _type: "event" | "timing_complete" | "exception",
  name: string,
  data?: UmamiEventData
) {
  if (typeof window === "undefined") return;
  // Logger en dev uniquement, sans dépendre de la dispo de window.umami :
  // le script est chargé `afterInteractive` donc peut manquer au moment
  // d'un event tiré très tôt. Un console.debug "umami: name { data }"
  // donne une vision claire du flux télémétrique sans polluer la prod.
  if (IS_DEV) {
    // eslint-disable-next-line no-console
    console.debug("[umami]", name, data ?? "");
  }
  try {
    window.umami?.track(name, data);
  } catch {
    // Silently fail if Umami is not available (e.g., ad blockers, offline)
  }
}

export function setUmamiUserId(userId: string | null) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.umami?.identify(userId);
  } catch {
    // Silently fail
  }
}
