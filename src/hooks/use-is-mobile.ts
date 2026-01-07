import { useSyncExternalStore, useCallback, useRef, useEffect } from "react";

// Tailwind's md breakpoint - keep in sync with tailwind.config.ts
const MOBILE_BREAKPOINT = 768;
const RESIZE_DEBOUNCE_MS = 150;

/**
 * Hook to detect mobile viewport with proper SSR/hydration handling.
 *
 * Uses `useSyncExternalStore` for correct hydration behavior:
 * - Returns `false` during SSR (desktop-first approach)
 * - Syncs immediately on hydration to reflect actual viewport
 * - Debounces resize events for performance
 *
 * @returns boolean - true if viewport width < 768px (Tailwind md breakpoint)
 */
export function useIsMobile(): boolean {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Subscribe to window resize with debouncing
  const subscribe = useCallback((callback: () => void) => {
    const debouncedCallback = () => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(callback, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener("resize", debouncedCallback);

    return () => {
      clearTimeout(timeoutRef.current);
      window.removeEventListener("resize", debouncedCallback);
    };
  }, []);

  // Get current snapshot of mobile state
  const getSnapshot = useCallback(() => {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }, []);

  // Server snapshot - always return false (desktop-first)
  const getServerSnapshot = useCallback(() => {
    return false;
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
