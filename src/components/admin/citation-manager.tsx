"use client";

import React, { useState, useMemo, useEffect } from "react";
import citationsDataV3 from "@/data/citations-v3.json";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Palette,
  Layout,
  Search,
  Trash2,
  Globe,
  Languages,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SuccessToast } from "@/components/common/success-toast";
import { useToast } from "@/hooks/use-toast";
import { useLocale, useTranslations } from "next-intl";
import { deleteCitationAdminAction } from "@/app/actions/admin-actions";

export function CitationManager() {
  const locale = useLocale();
  const t = useTranslations("Citations");
  const tLang = useTranslations("common.languages");
  const { message: toastMessage, setMessage: setToastMessage } = useToast();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<number | "all">("all");
  const [currentIndex, setCurrentIndex] = useState(0);

  // Local state for items
  const [items, setItems] = useState(citationsDataV3.items);

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category));
    return Array.from(cats);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.original.text.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase()) ||
        (item.attribution.author?.toLowerCase() || "").includes(search.toLowerCase());
      const matchesCategory = filterCategory === "all" || item.category === filterCategory;
      const matchesRating = filterRating === "all" || item.rating === filterRating;
      return matchesSearch && matchesCategory && matchesRating;
    });
  }, [items, search, filterCategory, filterRating]);

  // Reset index when filters change
  useEffect(() => {
    setCurrentIndex(0);
  }, [search, filterCategory, filterRating]);

  const activeItem = filteredItems[currentIndex];

  const handleNext = () => {
    if (filteredItems.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % filteredItems.length);
  };

  const handlePrev = () => {
    if (filteredItems.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === "n") handleNext();
      if (e.key === "ArrowLeft" || e.key === "p") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredItems.length]);

  const getAttributionLabel = (citation: any, targetLocale: string) => {
    const attr = citation.attribution;
    if (attr.author) return attr.author;

    if (attr.origin_type) {
      const typeLabel = t(`types.${attr.origin_type}`);
      let qualifierLabel = "";
      if (attr.origin_qualifier) {
        const languages = ["fr", "en", "el", "es", "pt", "de", "it", "ja", "la", "sv"];
        if (languages.includes(attr.origin_qualifier)) {
          qualifierLabel = tLang(attr.origin_qualifier);
        } else {
          try {
            qualifierLabel = t(`qualifiers.${attr.origin_qualifier}`);
          } catch {
            qualifierLabel = attr.origin_qualifier;
          }
        }
      }
      return qualifierLabel ? `${typeLabel} (${qualifierLabel})` : typeLabel;
    }
    return attr.work || attr.origin || t("anonymous");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement cette citation ?")) return;

    try {
      const result = await deleteCitationAdminAction({ id });
      if (result?.success) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setToastMessage({ text: "Citation supprimée", type: "success" });
      }
    } catch (error) {
      setToastMessage({ text: "Erreur lors de la suppression", type: "error" });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <SuccessToast message={toastMessage?.text || null} type={toastMessage?.type || "success"} />

      {/* Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 shadow-inner">
            <Languages className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text">Modération Citations</h1>
            <p className="text-sm font-medium italic text-muted-foreground">
              Utilisez les flèches{" "}
              <span className="rounded bg-black/5 px-2 py-0.5 font-bold text-accent">←</span>{" "}
              <span className="rounded bg-black/5 px-2 py-0.5 font-bold text-accent">→</span> pour
              naviguer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="mr-2 flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Index
            </span>
            <span className="text-sm font-black text-accent">
              {filteredItems.length > 0 ? currentIndex + 1 : 0} / {filteredItems.length}
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl"
              onClick={handlePrev}
              disabled={filteredItems.length === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl"
              onClick={handleNext}
              disabled={filteredItems.length === 0}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/20 bg-white/50 p-3 shadow-sm backdrop-blur-md sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="h-10 w-full rounded-xl border-none bg-white/80 pl-10 pr-4 text-sm shadow-sm focus:ring-2 focus:ring-accent/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="h-10 rounded-xl border-none bg-white/80 px-3 text-sm shadow-sm focus:ring-2 focus:ring-accent/20"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Catégories</option>
            {categories.sort().map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border-none bg-white/80 px-3 text-sm shadow-sm focus:ring-2 focus:ring-accent/20"
            value={filterRating}
            onChange={(e) =>
              setFilterRating(e.target.value === "all" ? "all" : Number(e.target.value))
            }
          >
            <option value="all">Notes</option>
            <option value="3">★★★</option>
            <option value="2">★★</option>
            <option value="1">★</option>
          </select>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeItem ? (
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, scale: 0.98, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.98, x: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/80 p-8 pt-10 shadow-2xl backdrop-blur-xl"
          >
            {/* Background Accent */}
            <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-accent/5" />

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              {/* Left Column: Principal View */}
              <div className="flex flex-col justify-between lg:col-span-5">
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black tracking-widest text-accent/40">
                      {activeItem.id}
                    </span>
                    <div className="flex gap-0.5">
                      {[...Array(3)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < (activeItem.rating || 1) ? "fill-yellow-400 text-yellow-400" : "text-gray-100"}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-3xl font-black italic leading-tight text-text">
                      « {activeItem.localized.fr || activeItem.original.text} »
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-[2px] w-8 bg-accent/20" />
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">
                        {getAttributionLabel(activeItem, "fr")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4">
                    <div className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                      <Palette className="h-3 w-3" /> {activeItem.tone || "soft"}
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Layout className="h-3 w-3" /> {activeItem.category}
                    </div>
                    {activeItem.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-black/5 px-3 py-1 text-[10px] font-medium italic text-muted-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-10 border-t border-black/5 pt-8 lg:mt-0">
                  <h4 className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-accent/50">
                    <Globe className="h-4 w-4" /> Détails Techniques
                  </h4>
                  <div className="scrollbar-hide max-h-40 overflow-auto rounded-2xl bg-black/5 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {JSON.stringify(activeItem.attribution, null, 2)}
                  </div>
                </div>
              </div>

              {/* Right Column: All Locales */}
              <div className="flex flex-col justify-between lg:col-span-7">
                <div>
                  <h4 className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-accent/50">
                    <Languages className="h-4 w-4" /> Aperçu toutes langues
                  </h4>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {["fr", "en", "de", "el", "es", "pt"].map((lang) => (
                      <div
                        key={lang}
                        className="group relative rounded-2xl border border-black/5 bg-white/50 p-4 shadow-sm transition-all hover:border-accent/20 hover:bg-white hover:shadow-lg"
                      >
                        <span className="absolute right-3 top-2 text-[10px] font-black uppercase text-accent/20">
                          {lang}
                        </span>
                        <div className="space-y-3">
                          <p className="text-text/80 line-clamp-2 text-[12px] font-medium italic leading-relaxed">
                            {activeItem.localized[lang as keyof typeof activeItem.localized] ||
                              activeItem.original.text}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="h-[1px] w-4 bg-accent/20" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-accent/60">
                              {getAttributionLabel(activeItem, lang)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-10 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Type
                      </span>
                      <span className="text-xs font-bold text-text">{activeItem.type}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Confiance
                      </span>
                      <span
                        className={`text-xs font-bold ${activeItem.attribution.confidence === "high" ? "text-green-500" : "text-orange-500"}`}
                      >
                        {activeItem.attribution.confidence || "medium"}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    className="group h-12 rounded-2xl px-6 text-destructive transition-all hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(activeItem.id)}
                  >
                    <Trash2 className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
                    <span className="text-xs font-bold uppercase tracking-widest">Supprimer</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-black/5 bg-white/50 py-40 text-muted-foreground backdrop-blur-sm">
            <Search className="mb-4 h-16 w-16 opacity-10" />
            <p className="text-xl font-medium">Aucune citation ne correspond au filtre.</p>
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => {
                setSearch("");
                setFilterCategory("all");
                setFilterRating("all");
              }}
            >
              Réinitialiser
            </Button>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap justify-center gap-1 px-10 pt-4">
        {filteredItems.slice(0, 100).map((_, i) => (
          <div
            key={i}
            className={`h-1 cursor-pointer rounded-full transition-all duration-300 ${i === currentIndex ? "w-8 bg-accent" : "w-1.5 bg-black/10 hover:bg-black/20"}`}
            onClick={() => setCurrentIndex(i)}
          />
        ))}
        {filteredItems.length > 100 && (
          <span className="text-xs text-muted-foreground">
            + {filteredItems.length - 100} de plus
          </span>
        )}
      </div>
    </div>
  );
}
