"use client";

import { useEffect, useRef, useState } from "react";

interface UseTrackViewOptions {
  onView: () => void;
  threshold?: number;
  triggerOnce?: boolean;
}

/**
 * Hook to track when an element becomes visible in the viewport
 * Uses IntersectionObserver for performance
 */
export function useTrackView<T extends HTMLElement = HTMLDivElement>({
  onView,
  threshold = 0.5,
  triggerOnce = true,
}: UseTrackViewOptions) {
  const ref = useRef<T>(null);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (triggerOnce && hasTriggered) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onView();
            if (triggerOnce) {
              setHasTriggered(true);
              observer.disconnect();
            }
          }
        });
      },
      { threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [onView, threshold, triggerOnce, hasTriggered]);

  return ref;
}
