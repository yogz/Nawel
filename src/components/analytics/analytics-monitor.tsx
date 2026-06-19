"use client";

import { useEffect } from "react";
import { trackPerformance, trackError } from "@/lib/analytics";

// Erreurs bénignes à ne PAS tracker : ce sont du bruit navigateur qui gonfle
// le compteur d'`exception` sans correspondre à un vrai bug applicatif.
// - "ResizeObserver loop…" : warning Chrome quand un callback ResizeObserver
//   déclenche un relayout ; inoffensif (cf. composants Radix/auto-resize).
// - "Script error." : message anonymisé des erreurs cross-origin (extensions,
//   scripts tiers) — non actionnable côté code.
const IGNORED_ERROR_PATTERNS = [/ResizeObserver loop/i, /^Script error\.?$/i];

export function shouldIgnoreClientError(message: string | undefined | null): boolean {
  if (!message) {
    return false;
  }
  return IGNORED_ERROR_PATTERNS.some((re) => re.test(message));
}

/**
 * Global component to track core web vitals and client-side errors
 * This help monitor the "perfection" of the application implementation
 */
export function AnalyticsMonitor() {
  useEffect(() => {
    // 1. Performance Monitoring (Core Web Vitals - Simplified)
    if (typeof window !== "undefined" && "performance" in window) {
      // Track Page Load Time
      const navigationEntry = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        trackPerformance("page_load_time", navigationEntry.duration, "init");
        trackPerformance("dom_ready", navigationEntry.domContentLoadedEventEnd, "init");
      }
    }

    // 2. Global Error Monitoring
    const handleError = (event: ErrorEvent) => {
      const message = event.error?.message ?? event.message;
      if (shouldIgnoreClientError(message)) {
        return;
      }
      trackError(event.error || event.message, "window_error", false);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(event.reason || "Unhandled Promise Rejection", "promise_rejection", false);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
