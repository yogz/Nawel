"use client";

import { LazyMotion, domMax } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Wraps the app in LazyMotion to reduce Framer Motion bundle size.
 * domMax covers animations + gestures + drag + layout (~29KB) vs ~45KB
 * loaded by default when importing `motion` directly.
 *
 * All app components should import `m` (aliased as `motion`) instead of `motion`
 * so features come from this provider on demand.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      {children}
    </LazyMotion>
  );
}
