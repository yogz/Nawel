"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook to track which service section is currently most visible on screen.
 * Uses IntersectionObserver to efficiently detect visibility.
 *
 * @returns Object with:
 * - visibleServiceId: The ID of the currently most visible service
 * - registerService: Function to register a service element for tracking
 * - unregisterService: Function to unregister a service element
 */
export function useVisibleService() {
  const [visibleServiceId, setVisibleServiceId] = useState<number | null>(null);
  const serviceRefs = useRef<Map<number, Element>>(new Map());
  const visibilityRatios = useRef<Map<number, number>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pendingObservations = useRef<Set<number>>(new Set());

  // Initialize observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Update visibility ratios for each observed element
        entries.forEach((entry) => {
          const serviceId = Number(entry.target.getAttribute("data-service-id"));
          if (!isNaN(serviceId)) {
            visibilityRatios.current.set(serviceId, entry.intersectionRatio);
          }
        });

        // Find the service with the highest visibility ratio
        let maxRatio = 0;
        let mostVisibleId: number | null = null;

        visibilityRatios.current.forEach((ratio, id) => {
          if (ratio > maxRatio) {
            maxRatio = ratio;
            mostVisibleId = id;
          }
        });

        // Only update if we have a visible service
        if (mostVisibleId !== null && maxRatio > 0) {
          setVisibleServiceId(mostVisibleId);
        }
      },
      {
        // Observe visibility with multiple thresholds for smooth tracking
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
        // Account for the header (approximately 120px) and tab bar (approximately 100px)
        rootMargin: "-120px 0px -100px 0px",
      }
    );

    // Observe any pending elements that were registered before observer was ready
    pendingObservations.current.forEach((serviceId) => {
      const element = serviceRefs.current.get(serviceId);
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });
    pendingObservations.current.clear();

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const registerService = useCallback((serviceId: number, element: Element | null) => {
    if (!element) return;

    // Store ref and set data attribute
    element.setAttribute("data-service-id", String(serviceId));
    serviceRefs.current.set(serviceId, element);

    // If observer is ready, observe immediately; otherwise queue for later
    if (observerRef.current) {
      observerRef.current.observe(element);
    } else {
      pendingObservations.current.add(serviceId);
    }
  }, []);

  const unregisterService = useCallback((serviceId: number) => {
    const element = serviceRefs.current.get(serviceId);
    if (element) {
      observerRef.current?.unobserve(element);
      serviceRefs.current.delete(serviceId);
      visibilityRatios.current.delete(serviceId);
    }
    pendingObservations.current.delete(serviceId);
  }, []);

  return {
    visibleServiceId,
    registerService,
    unregisterService,
  };
}
