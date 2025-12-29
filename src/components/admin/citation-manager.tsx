"use client";

import { useState } from "react";
import citationsDataV3 from "@/data/citations-v3.json";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function CitationManager() {
  const [index, setIndex] = useState(0);
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
    toast.success("Citation signalée comme inappropriée");
  };

  if (!citation) return <div>Aucune citation trouvée.</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
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
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  ID
                </p>
                <p className="font-mono text-sm text-text">{citation.id}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Catégorie
                </p>
                <p className="text-sm capitalize text-text">{citation.category}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Auteur
                </p>
                <p className="text-sm text-text">{citation.attribution.author || "Anonyme"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Source / Origine
                </p>
                <p className="text-sm text-text">
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
