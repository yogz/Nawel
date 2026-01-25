import type { Viewport } from "next";

/**
 * Event Page Layout
 * =================
 * This layout wraps all event pages (/event/[slug]/*) and provides:
 *
 * 1. VIEWPORT CONFIGURATION
 *    - viewportFit: "cover" enables content to extend under notches/safe areas
 *    - themeColor: Sets the status bar color on mobile browsers
 *    - IMPORTANT: themeColor must match --status-bar-color in globals.css
 *
 * 2. BACKGROUND GRADIENT
 *    - Fixed position gradient that extends under the status bar
 *    - Uses negative top positioning to cover safe-area-inset-top
 *    - Colors defined in globals.css as CSS custom properties
 *
 * 3. Z-INDEX: 0 (see globals.css for full hierarchy)
 *
 * To modify the status bar color:
 * 1. Update --status-bar-color in globals.css
 * 2. Update themeColor below to match
 */

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // IMPORTANT: This must match --status-bar-color in globals.css (#E6D9F8)
  themeColor: "#E6D9F8",
};

/**
 * EventGradientBackground
 * -----------------------
 * Fixed gradient background for event pages that creates an immersive
 * experience by extending under the mobile status bar.
 *
 * IMMERSIVE STATUS BAR:
 * - The status bar color (themeColor) is #E6D9F8 (lavender)
 * - The gradient must start with this exact color at the top edge
 * - We use a layered approach: solid color base + radial gradient overlay
 *
 * Technical details:
 * - Uses env(safe-area-inset-top) to extend gradient under notch/status bar
 * - Mask image creates smooth fade-out at bottom
 * - pointer-events: none ensures content remains interactive
 * - z-0 places it behind all content (see z-index hierarchy in globals.css)
 */
function EventGradientBackground() {
  return (
    <>
      {/* Base layer: Solid color matching themeColor for perfect status bar blend */}
      <div
        className="fixed inset-x-0 pointer-events-none z-0"
        style={{
          top: "calc(-1 * env(safe-area-inset-top, 0px))",
          height: "calc(100px + env(safe-area-inset-top, 0px))",
          // Must match themeColor exactly for seamless status bar
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

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EventGradientBackground />
      {children}
    </>
  );
}
