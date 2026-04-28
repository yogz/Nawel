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
    transition: { staggerChildren: 0.08, delayChildren: 0.3 },
  },
};

// Acid-green glow + a clearly visible bounce. The previous scale of
// 1.045 read as static on the dark surface, and the prior shadow
// vanished against #0a0a0a — both swapped for the acid token.
const itemVariants: Variants = {
  rest: { scale: 1, boxShadow: "0 0 0 0 rgba(199, 255, 60, 0)" },
  nudge: {
    scale: [1, 1.1, 0.98, 1],
    boxShadow: [
      "0 0 0 0 rgba(199, 255, 60, 0)",
      "0 0 0 4px rgba(199, 255, 60, 0.35)",
      "0 0 18px 2px rgba(199, 255, 60, 0.45)",
      "0 0 0 0 rgba(199, 255, 60, 0)",
    ],
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
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
    // restage it. Cascade total ≈ 0.3 (delay) + 6 × 0.08 + 0.7 ≈ 1.5s.
    const t = window.setTimeout(() => setShouldNudge(false), 1700);
    return () => window.clearTimeout(t);
    // Run once on mount only; ignoring `value` avoids re-firing the
    // nudge when the user starts/clears their selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
        C&rsquo;est quoi&nbsp;?
      </p>
      {/* `mask-image` fades the pills themselves to transparent on the
          right edge instead of overlaying the page bg. Avoids the muddy
          look the previous gradient overlay produced over `bg-surface-200`
          pills (whose surface is slightly lighter than the page bg). */}
      <div
        className="-mx-6 overflow-x-auto px-6 pr-10 [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_0,black_calc(100%_-_2.5rem),transparent_100%)] [&::-webkit-scrollbar]:hidden"
      >
        <motion.ul
          className="flex w-max gap-2 py-1"
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
                      ? "bg-acid-600 text-surface-50"
                      : "border border-ink-300 bg-surface-200 text-ink-700 hover:border-ink-400 hover:bg-surface-300"
                  }`}
                >
                  {opt.label}
                </button>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </div>
  );
}
