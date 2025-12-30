"use client";

import React, { useState, useMemo } from "react";
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
  Search,
  Filter,
  Eye,
  Trash2,
  CheckCircle2,
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Local state for items to show deletions immediately
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

  const getAttributionLabel = (citation: (typeof items)[0], targetLocale: string) => {
    const attr = citation.attribution;
    if (attr.author) return attr.author;

    // We can't easily use next-intl's 't' for other locales in a client component
    // without multiple 'useTranslations' or specific logic.
    // For the admin dashboard, we'll use a simplified mapping or just the raw data
    // to show how it *will* look, but since we are in one locale,
    // let's just use the current 't' for labels but show the raw data where needed.

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
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer cette citation ? Cette action est irréversible dans le fichier JSON."
      )
    ) {
      return;
    }

    try {
      const result = await deleteCitationAdminAction({ id });
      if (result?.success) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setToastMessage({ text: "Citation supprimée avec succès", type: "success" });
      }
    } catch (error) {
      setToastMessage({ text: "Erreur lors de la suppression", type: "error" });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <SuccessToast message={toastMessage?.text || null} type={toastMessage?.type || "success"} />

      {/* Header & Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 shadow-inner">
            <Layout className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text">Dashboard Citations</h1>
            <p className="text-sm text-muted-foreground">
              {filteredItems.length} citations sur {items.length} au total
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/20 bg-white/50 p-4 shadow-sm backdrop-blur-md sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par texte, ID ou auteur..."
            className="h-10 w-full rounded-xl border-none bg-white/50 pl-10 pr-4 text-sm focus:ring-2 focus:ring-accent/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-xl border-none bg-white/50 px-3 text-sm focus:ring-2 focus:ring-accent/20"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">Toutes catégories</option>
          {categories.sort().map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-xl border-none bg-white/50 px-3 text-sm focus:ring-2 focus:ring-accent/20"
          value={filterRating}
          onChange={(e) =>
            setFilterRating(e.target.value === "all" ? "all" : Number(e.target.value))
          }
        >
          <option value="all">Toutes les notes</option>
          <option value="3">Rating 3 (Premium)</option>
          <option value="2">Rating 2 (Standard)</option>
          <option value="1">Rating 1 (Défaut)</option>
        </select>
      </div>

      {/* Citations List/Table */}
      <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/80 shadow-xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-black/5 bg-black/[0.02]">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  ID / Cat
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Note
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Locales
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Texte (FR)
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredItems.map((item) => (
                <React.Fragment key={item.id}>
                  <tr
                    className={`group transition-colors hover:bg-accent/5 ${expandedId === item.id ? "bg-accent/5" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold text-text">{item.id}</span>
                        <span className="text-[10px] capitalize text-muted-foreground">
                          {item.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-0.5">
                        {[...Array(3)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < (item.rating || 1) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-1">
                        {Object.keys(item.localized).map((lang) => (
                          <span
                            key={lang}
                            className="flex h-5 w-5 items-center justify-center rounded bg-black/5 text-[9px] font-black uppercase text-accent/40"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-text/80 max-w-xs truncate px-6 py-4 text-sm italic">
                      « {item.localized.fr || item.original.text} »
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 rounded-lg ${expandedId === item.id ? "bg-accent/10 text-accent" : ""}`}
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Details Row */}
                  <AnimatePresence>
                    {expandedId === item.id && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <td colSpan={5} className="bg-accent/[0.02] px-6 py-8">
                          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                            {/* Left: App Rendering Preview */}
                            <div className="space-y-4">
                              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent">
                                <Layout className="h-4 w-4" /> App Performance Preview
                              </h3>
                              <div className="space-y-3 rounded-2xl border border-accent/20 bg-white/50 p-6 shadow-inner">
                                <div className="space-y-1">
                                  <p className="text-[14px] font-medium italic text-accent/70">
                                    — {item.localized.fr || item.original.text}
                                  </p>
                                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent/50">
                                    — {getAttributionLabel(item, "fr")}
                                  </p>
                                </div>
                                <div className="border-t border-accent/10 pt-2">
                                  <p className="mb-2 text-[10px] italic text-muted-foreground">
                                    Exemple de rendu dynamique basé sur les métadonnées (Type:{" "}
                                    {item.attribution.origin_type || "N/A"})
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                                    Ton
                                  </p>
                                  <p className="text-sm capitalize">{item.tone || "N/A"}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                                    Confiance Source
                                  </p>
                                  <p className="text-sm capitalize">
                                    {item.attribution.confidence || "medium"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Right: Technical Data */}
                            <div className="space-y-4">
                              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                <Palette className="h-4 w-4" /> Détails Techniques
                              </h3>

                              <div className="space-y-3">
                                <div>
                                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                                    Tags
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {item.tags.map((tag) => (
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
                                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                                    Full Localizations
                                  </p>
                                  <div className="mt-2 grid grid-cols-2 gap-2">
                                    {Object.entries(item.localized).map(([lang, text]) => (
                                      <div key={lang} className="rounded-xl bg-black/5 p-3">
                                        <span className="text-[10px] font-black uppercase text-accent/40">
                                          {lang}
                                        </span>
                                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text">
                                          {text}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search className="h-10 w-10 opacity-20" />
            <p className="mt-4 font-medium">Aucune citation ne correspond à vos critères.</p>
          </div>
        )}
      </div>
    </div>
  );
}
