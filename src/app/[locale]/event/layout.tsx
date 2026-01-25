import type { Viewport } from "next";

/**
 * Event List Layout
 * =================
 * This layout wraps the event list page (/event) and provides the same
 * gradient background as the event detail pages for visual consistency.
 *
 * Uses the same --event-header-gradient and --status-bar-color CSS variables
 * defined in globals.css.
 */

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // IMPORTANT: Must match --status-bar-color in globals.css (#E6D9F8)
  themeColor: "#E6D9F8",
};

function EventListGradientBackground() {
  return (
    <>
      {/* Base layer: Solid color matching themeColor for perfect status bar blend */}
      <div
        className="fixed inset-x-0 pointer-events-none z-0"
        style={{
          top: "calc(-1 * env(safe-area-inset-top, 0px))",
          height: "calc(100px + env(safe-area-inset-top, 0px))",
          backgroundColor: "var(--status-bar-color)",
        }}
        aria-hidden="true"
      />
      {/* Gradient layer: Decorative radial gradient */}
      <div
        className="fixed inset-x-0 pointer-events-none z-0"
        style={{
          top: "calc(-1 * env(safe-area-inset-top, 0px))",
          height: "calc(280px + env(safe-area-inset-top, 0px))",
          background: "var(--event-header-gradient)",
          maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
        }}
        aria-hidden="true"
      />
    </>
  );
}

export default function EventListLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EventListGradientBackground />
      {children}
    </>
  );
}
