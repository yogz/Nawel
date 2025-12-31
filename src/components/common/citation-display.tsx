import { useMemo, useState } from "react";
import citationsDataV3 from "@/data/citations-v3.json";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Quote } from "lucide-react";

export function CitationDisplay({ seed, item }: { seed?: string; item?: any }) {
  const locale = useLocale();
  const t = useTranslations("Citations");
  const tLang = useTranslations("common.languages");
  const [step, setStep] = useState(0);

  const citationItem = useMemo(() => {
    if (item) {
      return item;
    }
    const list = citationsDataV3.items;
    const today = new Date();
    const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}-${seed || ""}`;
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % list.length;
    return list[index];
  }, [seed, item]);

  const preferredTranslation = useMemo(() => {
    if (citationItem.original.lang === locale) {
      return null;
    }
    return (citationItem.localized as Record<string, string>)[locale] || null;
  }, [citationItem, locale]);

  const attributionLabel = useMemo(() => {
    const attr = citationItem.attribution;
    const parts: string[] = [];

    // 1. Determine the Flag
    const flagMap: Record<string, string> = {
      fr: "🇫🇷",
      en: "🇬🇧",
      es: "🇪🇸",
      pt: "🇵🇹",
      de: "🇩🇪",
      el: "🇬🇷",
      it: "🇮🇹",
      ja: "🇯🇵",
      la: "📜",
      sv: "🇸🇪",
      da: "🇩🇰",
    };

    const flag = flagMap[attr.origin_qualifier || ""] || flagMap[citationItem.original.lang] || "";

    // 2. Author & Work (Priority 1)
    if (attr.author && attr.work) {
      if (attr.work === "Aphorisme attribué" || attr.work === "Citation attribuée") {
        // Skip hardcoded legacy work strings
      } else {
        parts.push(`${attr.author}, ${attr.work}`);
      }
    } else if (attr.author) {
      parts.push(attr.author);
    } else if (attr.work) {
      parts.push(attr.work);
    }

    // 3. Building the final label
    let baseLabel = "";

    if (attr.origin_type) {
      const type = t(`types.${attr.origin_type}`);
      let qualifier = "";

      if (attr.origin_qualifier) {
        const languages = Object.keys(flagMap);
        if (languages.includes(attr.origin_qualifier)) {
          qualifier = tLang(attr.origin_qualifier);
        } else {
          try {
            qualifier = t(`qualifiers.${attr.origin_qualifier}`);
          } catch {
            qualifier = attr.origin_qualifier;
          }
        }
      }

      const typeLabel = qualifier ? `${type} (${qualifier})` : type;

      // If we already have an author, combine them (e.g. "Marcel Proust, Aphorisme (Attribué)")
      if (parts.length > 0) {
        baseLabel = `${parts[0]}, ${typeLabel}`;
      } else {
        baseLabel = typeLabel;
      }
    } else {
      // Fallback or Anonymous
      if (parts.length > 0) {
        baseLabel = parts[0];
      } else {
        baseLabel = attr.origin || t("anonymous");
      }
    }

    return flag ? `${flag} ${baseLabel}` : baseLabel;
  }, [citationItem, t, tLang]);

  const availableSteps = useMemo(() => {
    const steps = [{ type: "text", value: citationItem.original.text }];
    if (preferredTranslation) {
      steps.push({ type: "text", value: preferredTranslation });
    }
    if (attributionLabel) {
      steps.push({ type: "author", value: attributionLabel });
    }
    return steps;
  }, [citationItem, preferredTranslation, attributionLabel]);

  const currentContent = availableSteps[step % availableSteps.length];

  return (
    <div
      className="group relative cursor-pointer select-none"
      onClick={(e) => {
        e.stopPropagation();
        setStep((s: number) => (s + 1) % availableSteps.length);
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
