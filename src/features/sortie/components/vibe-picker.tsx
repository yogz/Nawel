"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { VIBE_OPTIONS, type Vibe } from "../lib/vibe-config";

type Props = {
  value: Vibe | null;
  onChange: (next: Vibe | null) => void;
};

const containerVariants: Variants = {
  rest: {},
  nudge: {
    transition: { staggerChildren: 0.06, delayChildren: 0.25 },
  },
};

const itemVariants: Variants = {
  rest: { scale: 1, boxShadow: "0 0 0 0 rgba(0,0,0,0)" },
  nudge: {
    scale: [1, 1.045, 1],
    boxShadow: [
      "0 0 0 0 rgba(0,0,0,0)",
      "0 4px 14px -6px rgba(99, 0, 41, 0.35)",
      "0 0 0 0 rgba(0,0,0,0)",
    ],
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

/**
 * Horizontal scrollable row of category chips at the top of the
 * create wizard's `paste` step. Optional — tapping the current
 * selection again clears it.
 *
 * Styling per UX review: compact `h-9` chips, no icons (label alone
 * reads clearer at this size), cobalt-solid when selected to match
 * the app's CTA vocabulary (not the pastel VibeButtons from the
 * home — those signal exploration, this signals tagging).
 *
 * Mount nudge: a single-pass cascade pulse on first render hints that
 * these chips are tappable. Skipped if the user already picked a vibe
 * or has reduced-motion enabled.
 */
export function VibePicker({ value, onChange }: Props) {
  const [shouldNudge, setShouldNudge] = useState(false);

  useEffect(() => {
    if (value !== null) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    setShouldNudge(true);
    // Single-pass: clear after the cascade plays so re-renders don't
    // restage it. Cascade total ≈ 0.25 (delay) + 6 × 0.06 + 0.5 ≈ 1.1s.
    const t = window.setTimeout(() => setShouldNudge(false), 1300);
    return () => window.clearTimeout(t);
    // Run once on mount only; ignoring `value` avoids re-firing the
    // nudge when the user starts/clears their selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-encre-400">
        C&rsquo;est quoi&nbsp;?
      </p>
      <div className="relative">
        <div className="-mx-6 overflow-x-auto px-6 pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <motion.ul
            className="flex w-max gap-2"
            variants={containerVariants}
            initial="rest"
            animate={shouldNudge ? "nudge" : "rest"}
          >
            {VIBE_OPTIONS.map((opt) => {
              const active = value === opt.value;
              return (
                <motion.li
                  key={opt.value}
                  className="shrink-0 rounded-full"
                  variants={itemVariants}
                >
                  <button
                    type="button"
                    onClick={() => onChange(active ? null : opt.value)}
                    aria-pressed={active}
                    className={`inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium transition-colors motion-safe:active:scale-95 ${
                      active
                        ? "bg-bordeaux-600 text-ivoire-50"
                        : "border border-encre-300 bg-ivoire-200 text-encre-700 hover:border-encre-400 hover:bg-ivoire-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        </div>
        {/* Right-edge fade to hint at scrollable content. Uses the
            sortie cream surface colour so it blends with whatever
            step background sits behind — no hardcoded bg needed. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--sortie-cream)] to-transparent"
        />
      </div>
    </div>
  );
}
