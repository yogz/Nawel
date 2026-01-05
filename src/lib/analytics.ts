"use client";

import { sendGAEvent } from "@next/third-parties/google";

/**
 * Centralized analytics tracking for the event page
 * All GA4 events are prefixed with the action context for easy filtering
 */

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
  | "filter_changed"
  | "drag_drop_used";

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
  try {
    sendGAEvent("event", action, {
      event_category: category,
      event_label: label,
      value,
      ...extra,
    });
  } catch (error) {
    // Silently fail if GA is not available (e.g., ad blockers)
    console.debug("[Analytics] Failed to track event:", action, error);
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
  action: "ai_ingredients_generated",
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
