"use client";

import { useMemo, useState } from "react";
import citationsDataV3 from "@/data/citations-v3.json";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";

export function CitationDisplay() {
  const locale = useLocale();
  const [step, setStep] = useState(0);

  const citationItem = useMemo(() => {
    const list = citationsDataV3.items;
    // Use a stable seed for the day to avoid hydration issues and change daily
    const today = new Date();
    const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % list.length;
    return list[index];
  }, []);

  const preferredTranslation = useMemo(() => {
    // Only show translation if it's different from the original language
    if (citationItem.original.lang === locale) return null;
    return (citationItem.localized as Record<string, string>)[locale] || null;
  }, [citationItem, locale]);

  const author = citationItem.attribution.author || citationItem.attribution.origin;

  // Steps: 0 = Original, 1 = Preferred Translation (if exists), 2 = Author (if exists)
  // We handle the steps dynamically
  const availableSteps = useMemo(() => {
    const steps = [{ type: "text", value: citationItem.original.text }];
    if (preferredTranslation) {
      steps.push({ type: "text", value: preferredTranslation });
    }
    if (author) {
      steps.push({ type: "author", value: author });
    }
    return steps;
  }, [citationItem, preferredTranslation, author]);

  const currentContent = availableSteps[step % availableSteps.length];

  return (
    <div
      className="mt-1 cursor-pointer select-none"
      onClick={(e) => {
        e.stopPropagation();
        setStep((s) => (s + 1) % availableSteps.length);
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${citationItem.id}-${step}`}
          initial={{ opacity: 0, scale: 0.98, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -5 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {currentContent.type === "text" ? (
            <p className="text-[13px] font-medium italic leading-tight text-accent/60">
              « {currentContent.value} »
            </p>
          ) : (
            <p className="text-[11px] font-bold uppercase tracking-widest text-accent/40">
              — {currentContent.value}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
