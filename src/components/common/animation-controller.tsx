"use client";

import { useEffect } from "react";
import { usePageVisibility } from "@/hooks/use-page-visibility";

/**
 * Component that controls CSS animations based on page visibility
 * Pauses expensive animations when the page is not visible to save battery
 */
export function AnimationController() {
  const isVisible = usePageVisibility();

  useEffect(() => {
    if (isVisible) {
      document.body.classList.remove("animation-paused");
    } else {
      document.body.classList.add("animation-paused");
    }
  }, [isVisible]);

  return null;
}
