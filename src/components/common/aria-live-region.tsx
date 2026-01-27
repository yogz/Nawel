"use client";

/**
 * Aria-live region component for announcing dynamic content updates to screen readers
 * Use this to announce important changes that happen without page navigation
 */
export function AriaLiveRegion({ children, level = "polite" }: { children: React.ReactNode; level?: "polite" | "assertive" }) {
  return (
    <div
      role="status"
      aria-live={level}
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  );
}
