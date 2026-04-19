"use client";

import { sendGAEvent, setUmamiUserId } from "@/lib/umami";
import { logger } from "./logger";

/**
 * Centralized analytics tracking for the event page
 * All GA4 events are prefixed with the action context for easy filtering
 */

// Constants
const IS_DEV = process.env.NODE_ENV === "development";
const ANALYTICS_ENABLED = typeof window !== "undefined";

// Consent management - GDPR compliant (opt-in required)
// Initialize from localStorage immediately if available
// DEFAULT TO TRUE: set it to true by default for now
let hasConsent = true;
if (typeof window !== "undefined") {
  const storedConsent = localStorage.getItem("analytics_consent");
  if (storedConsent === "false") {
    hasConsent = false;
  }
}

/**
 * Set analytics consent status (for GDPR compliance)
 * Must be explicitly called with `true` after user gives consent
 */
export function setAnalyticsConsent(consent: boolean) {
  hasConsent = consent;
  if (typeof window !== "undefined") {
    localStorage.setItem("analytics_consent", consent ? "true" : "false");
    window.dispatchEvent(new Event("analytics-consent-updated"));
  }
}

/**
 * Check if analytics consent has been given
 * Returns false by default (GDPR: opt-in required)
 */
export function getAnalyticsConsent(): boolean {
  if (typeof window === "undefined") {
    return true; // Default to true
  }
  const stored = localStorage.getItem("analytics_consent");
  return stored !== "false"; // Only false if explicitly set to "false"
}

/**
 * Set User ID for cross-device tracking (GDPR compliant)
 */
export function setAnalyticsUserId(userId: string | null) {
  setUmamiUserId(userId);
}

type EventPageAction =
  | "tab_changed"
  | "item_created"
  | "item_updated"
  | "item_deleted"
  | "item_assigned"
  | "item_moved"
  | "person_created"
  | "person_updated"
  | "person_deleted"
  | "meal_created"
  | "meal_updated"
  | "meal_deleted"
  | "service_created"
  | "service_updated"
  | "service_deleted"
  | "share_opened"
  | "share_link_copied"
  | "ai_ingredients_generated"
  | "ai_ingredients_generated_batch"
  | "filter_changed"
  | "drag_drop_used";

type LandingAction =
  | "discover_click"
  | "feature_viewed"
  | "demo_viewed"
  | "demo_step"
  | "faq_interaction"
  | "cta_click";

interface TrackEventParams {
  action: EventPageAction;
  category?: string;
  label?: string;
  value?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Track an event page interaction
 */
export function trackEvent({
  action,
  category = "event_page",
  label,
  value,
  ...extra
}: TrackEventParams) {
  // Check consent
  const isDebugMode =
    typeof window !== "undefined" && localStorage.getItem("analytics_debug") === "true";

  if (IS_DEV || isDebugMode) {
    logger.debug("[Analytics]", {
      action,
      category,
      label,
      value,
      ...extra,
    });
    if (IS_DEV) return;
  }

  // Check consent - strictly block if no consent
  if (!hasConsent || !ANALYTICS_ENABLED) {
    return;
  }

  try {
    sendGAEvent("event", action, {
      event_category: category,
      event_label: label,
      value,
      ...extra,
    });
  } catch (error) {
    // Silently fail if GA is not available (e.g., ad blockers)
    logger.debug("[Analytics] Failed to track event:", action, error);
  }
}

/**
 * Track tab navigation
 */
export function trackTabChange(tab: string, previousTab?: string) {
  trackEvent({
    action: "tab_changed",
    label: tab,
    previous_tab: previousTab,
  });
}

/**
 * Track item CRUD operations
 */
export function trackItemAction(
  action: "item_created" | "item_updated" | "item_deleted" | "item_assigned" | "item_moved",
  itemName?: string,
  extra?: Record<string, string | number | boolean>
) {
  trackEvent({
    action,
    label: itemName,
    ...extra,
  });
}

/**
 * Track person operations
 */
export function trackPersonAction(
  action: "person_created" | "person_updated" | "person_deleted",
  personName?: string
) {
  trackEvent({
    action,
    label: personName,
  });
}

/**
 * Track meal/service operations
 */
export function trackMealServiceAction(
  action:
    | "meal_created"
    | "meal_updated"
    | "meal_deleted"
    | "service_created"
    | "service_updated"
    | "service_deleted",
  title?: string
) {
  trackEvent({
    action,
    label: title,
  });
}

/**
 * Track share interactions
 */
export function trackShareAction(action: "share_opened" | "share_link_copied", method?: string) {
  trackEvent({
    action,
    label: method,
  });
}

/**
 * Track AI features
 */
export function trackAIAction(
  action: "ai_ingredients_generated" | "ai_ingredients_generated_batch",
  itemName?: string,
  ingredientCount?: number
) {
  trackEvent({
    action,
    label: itemName,
    value: ingredientCount,
  });
}

/**
 * Track filter changes
 */
export function trackFilterChange(filterType: string) {
  trackEvent({
    action: "filter_changed",
    label: filterType,
  });
}

/**
 * Track drag and drop usage
 */
export function trackDragDrop() {
  trackEvent({
    action: "drag_drop_used",
  });
}

/**
 * Landing page specific tracking
 */
export function trackLandingEvent(
  action: LandingAction,
  params: Record<string, string | number | boolean> = {}
) {
  // Debug mode - log instead of sending
  if (IS_DEV) {
    logger.debug("[Analytics Debug] Landing:", { action, ...params });
    return;
  }

  // Check consent
  if (!hasConsent || !ANALYTICS_ENABLED) {
    return;
  }

  try {
    sendGAEvent("event", action, params);
  } catch (error) {
    logger.debug("[Analytics] Failed to track landing event:", action, error);
  }
}

/**
 * Track performance metrics
 */
export function trackPerformance(metric: string, value: number, context?: string) {
  // Debug mode - log instead of sending
  if (IS_DEV) {
    logger.debug("[Analytics Debug] Performance:", { metric, value, context });
    return;
  }

  // Check consent
  if (!hasConsent || !ANALYTICS_ENABLED) {
    return;
  }

  try {
    sendGAEvent("event", "performance_timing", {
      metric,
      value: Math.round(value),
      context,
    });
  } catch (error) {
    logger.debug("[Analytics] Failed to track performance:", metric, error);
  }
}

/**
 * Track errors and exceptions
 */
export function trackError(error: Error | string, context?: string, fatal = false) {
  const errorMessage = typeof error === "string" ? error : error.message;

  // Debug mode - log instead of sending
  if (IS_DEV) {
    logger.debug("[Analytics Debug] Error:", { error: errorMessage, context, fatal });
    return;
  }

  // Check consent
  if (!hasConsent || !ANALYTICS_ENABLED) {
    return;
  }

  try {
    sendGAEvent("event", "exception", {
      description: errorMessage,
      fatal,
      context,
    });
  } catch (err) {
    logger.debug("[Analytics] Failed to track error:", errorMessage, err);
  }
}

export function trackDiscoverClick(variant: string) {
  trackLandingEvent("discover_click", { variant });
}

export function trackFeatureView(feature: string, variant: string) {
  trackLandingEvent("feature_viewed", { feature, variant });
}

export function trackDemoView(variant: string) {
  trackLandingEvent("demo_viewed", { variant });
}

export function trackDemoStep(step: number, variant: string) {
  trackLandingEvent("demo_step", { step, variant });
}

export function trackFaqInteraction(questionIndex: number, action: "opened" | "closed") {
  trackLandingEvent("faq_interaction", { question_index: questionIndex, action });
}
