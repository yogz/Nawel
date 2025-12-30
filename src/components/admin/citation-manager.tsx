"use client";

import { useState, useMemo } from "react";
import citationsDataV3 from "@/data/citations-v3.json";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  Star,
  Tag,
  Palette,
  Layout,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SuccessToast } from "@/components/common/success-toast";
import { useToast } from "@/hooks/use-toast";
import { useLocale, useTranslations } from "next-intl";

export function CitationManager() {
  const locale = useLocale();
  const t = useTranslations("Citations");
  const tLang = useTranslations("common.languages");
  const [index, setIndex] = useState(0);
  const { message: toastMessage, setMessage: setToastMessage } = useToast();
  const citations = citationsDataV3.items;
  const citation = citations[index];

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % citations.length);
  };

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 + citations.length) % citations.length);
  };

  const handleReport = () => {
    console.log("Reported citation:", citation.id);
    setToastMessage({ text: "Citation signalée comme inappropriée", type: "success" });
  };

  const attributionLabel = useMemo(() => {
    const attr = citation.attribution;
    if (attr.author) return attr.author;

    if (attr.origin_type) {
      const type = t(`types.${attr.origin_type}`);
      let qualifier = "";

      if (attr.origin_qualifier) {
        const languages = ["fr", "en", "el", "es", "pt", "de", "it", "ja", "la", "sv"];
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

      return qualifier ? `${type} (${qualifier})` : type;
    }

    return attr.work || attr.origin || t("anonymous");
  }, [citation, t, tLang]);

  if (!citation) return <div>Aucune citation trouvée.</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <SuccessToast message={toastMessage?.text || null} type={toastMessage?.type || "success"} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Info className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-text">Détails de la citation</h2>
            <p className="text-sm text-muted-foreground">
              {index + 1} sur {citations.length}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={citation.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-3xl border border-white/20 bg-white/80 p-8 shadow-xl backdrop-blur-sm"
        >
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-accent/50">
                Français (Original/Référence)
              </p>
              <p className="mt-2 text-xl font-black text-text">
                « {citation.localized.fr || citation.original.text} »
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <Layout className="h-3 w-3" /> ID / Type
                </p>
                <p className="font-mono text-sm text-text">
                  {citation.id}{" "}
                  <span className="ml-2 rounded-md bg-accent/5 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                    {citation.type}
                  </span>
                </p>
              </div>

              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <Star className="h-3 w-3" /> Rating
                </p>
                <div className="mt-1 flex gap-0.5">
                  {[...Array(3)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < (citation.rating || 1) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <Palette className="h-3 w-3" /> Ton / Catégorie
                </p>
                <p className="text-sm text-text">
                  <span className="capitalize">{citation.tone || "N/A"}</span>
                  <span className="mx-2 text-muted-foreground">/</span>
                  <span className="capitalize">{citation.category}</span>
                </p>
              </div>

              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <Tag className="h-3 w-3" /> Tags
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {citation.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Auteur
                </p>
                <p className="text-sm text-text">{citation.attribution.author || "Anonyme"}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Rendu App (Locale: {locale})
                </p>
                <p className="text-sm font-bold text-accent">— {attributionLabel}</p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Source / Type / Qualificatif
                </p>
                <p className="text-sm text-text">
                  {citation.attribution.origin_type || "N/A"}
                  {citation.attribution.origin_qualifier
                    ? ` (${citation.attribution.origin_qualifier})`
                    : ""}
                  <span className="mx-2 text-muted-foreground">•</span>
                  {citation.attribution.work || citation.attribution.origin || "N/A"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Traductions
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Object.entries(citation.localized).map(([lang, text]) => (
                  <div key={lang} className="rounded-lg bg-black/5 p-2 px-3">
                    <span className="text-[10px] font-bold uppercase text-accent/40">{lang}</span>
                    <p className="text-xs text-text">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="destructive" className="gap-2" onClick={handleReport}>
                <AlertTriangle className="h-4 w-4" />
                Signaler comme inapproprié
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
