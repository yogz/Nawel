"use client";

import { LazyMotion, MotionConfig, domMax } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Wraps the app in LazyMotion to reduce Framer Motion bundle size.
 * domMax covers animations + gestures + drag + layout (~29KB) vs ~45KB
 * loaded by default when importing `motion` directly.
 *
 * All app components should import `m` (aliased as `motion`) instead of `motion`
 * so features come from this provider on demand.
 *
 * MotionConfig reducedMotion="user" makes every Framer Motion component respect
 * the OS "reduce motion" preference (WCAG 2.3.3): transform/scale/rotate/layout
 * animations are skipped while opacity still fades. This covers the whole app at
 * once instead of guarding each component individually.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
