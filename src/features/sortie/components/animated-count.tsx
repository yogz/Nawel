"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  /** Stable key driving the swap. Pass the underlying number for word counts. */
  value: number | string;
  children: ReactNode;
};

/**
 * Wraps a textual count (e.g. "trois") and fades it up/out whenever the
 * underlying value changes. Designed for the participant-list headline
 * where the prose form ("Vous êtes trois à avoir dit oui") matters more
 * than a digit tween.
 */
export function AnimatedCount({ value, children }: Props) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={String(value)}
        initial={{ y: 6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -6, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="inline-block"
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}
