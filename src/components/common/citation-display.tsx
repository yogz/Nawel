import { useMemo, useState } from "react";
import citationsDataV3 from "@/data/citations-v3.json";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";
import { Quote } from "lucide-react";

export function CitationDisplay() {
  const locale = useLocale();
  const [step, setStep] = useState(0);

  const citationItem = useMemo(() => {
    const list = citationsDataV3.items;
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
    if (citationItem.original.lang === locale) return null;
    return (citationItem.localized as Record<string, string>)[locale] || null;
  }, [citationItem, locale]);

  const author = citationItem.attribution.author || citationItem.attribution.origin;

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
      className="group relative cursor-pointer select-none"
      onClick={(e) => {
        e.stopPropagation();
        setStep((s) => (s + 1) % availableSteps.length);
      }}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-1 flex-shrink-0 opacity-20 transition-opacity group-hover:opacity-40">
          <Quote className="h-3 w-3 rotate-180 text-accent" />
        </div>

        <div className="relative min-h-[1.5rem] flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${citationItem.id}-${step}`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col"
            >
              {currentContent.type === "text" ? (
                <p className="text-[14px] font-medium italic leading-relaxed tracking-tight text-accent/70 decoration-accent/20 underline-offset-4 transition-colors group-hover:text-accent">
                  {currentContent.value}
                </p>
              ) : (
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent/50">
                  — {currentContent.value}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
