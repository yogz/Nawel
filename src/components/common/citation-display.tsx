"use client";

import { useMemo, useState } from "react";
import citationsDataV3 from "@/data/citations-v3.json";
import { motion, AnimatePresence } from "framer-motion";

export function CitationDisplay() {
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

  const translations = useMemo(() => {
    return Object.entries(citationItem.localized).filter(
      ([lang]) => lang !== citationItem.original.lang
    );
  }, [citationItem]);

  const author = citationItem.attribution.author || citationItem.attribution.origin;

  // Steps: 0 = Original, 1..N = Translations, N+1 = Author (if exists)
  const totalSteps = 1 + translations.length + (author ? 1 : 0);

  const currentContent = useMemo(() => {
    if (step === 0) return { type: "text", value: citationItem.original.text };
    if (step <= translations.length) {
      return { type: "text", value: translations[step - 1][1] };
    }
    return { type: "author", value: author };
  }, [step, citationItem, translations, author]);

  return (
    <div
      className="mt-1 cursor-pointer select-none"
      onClick={(e) => {
        e.stopPropagation();
        setStep((s) => (s + 1) % totalSteps);
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
