"use client";

import { useEffect } from "react";
import { trackPerformance, trackError } from "@/lib/analytics";

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
