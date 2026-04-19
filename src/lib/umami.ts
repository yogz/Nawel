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

export function sendGAEvent(
  _type: "event" | "timing_complete" | "exception",
  name: string,
  data?: UmamiEventData
) {
  if (typeof window === "undefined") return;
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
