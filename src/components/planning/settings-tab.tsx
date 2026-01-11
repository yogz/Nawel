"use client";

import { useState } from "react";
import {
  Trash2,
  Sparkles,
  Globe,
  Check,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  Coffee,
  ArrowUpRight,
} from "lucide-react";
import { useThemeMode } from "@/components/theme-provider";
import { useTranslations } from "next-intl";
import { LanguageSelector } from "@/components/common/language-selector";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface SettingsTabProps {
  onDeleteEvent: () => void;
  readOnly: boolean;
  isOwner?: boolean;
}

export function SettingsTab({ onDeleteEvent, readOnly, isOwner }: SettingsTabProps) {
  const t = useTranslations("EventDashboard.Settings");
  const _tShared = useTranslations("EventDashboard.Shared");
  const { theme, setTheme, themes } = useThemeMode();
  const [showDangerZone, setShowDangerZone] = useState(false);

  return (
    <div className="space-y-8 duration-500 animate-in fade-in slide-in-from-bottom-4">
      <div className="premium-card space-y-4 p-6">
        <h3 className="text-text/40 flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <Sparkles size={14} /> {t("ambiance")}
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                theme === t.id
                  ? "border-accent/30 bg-accent/10 ring-2 ring-accent/20"
                  : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{t.emoji}</span>
                <div className="text-left">
                  <p className="text-sm font-bold text-text">{t.label}</p>
                  <p className="text-[10px] font-medium text-gray-500">{t.description}</p>
                </div>
              </div>
              {theme === t.id && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white">
                  <Check size={14} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="premium-card space-y-4 p-6">
        <h3 className="text-text/40 flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <Globe size={14} /> {t("language")}
        </h3>
        <LanguageSelector variant="grid" showSearch />
      </div>

      {!readOnly && isOwner && (
        <div className="space-y-6 pt-4">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => setShowDangerZone(!showDangerZone)}
              className="text-text/20 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors hover:text-red-400"
            >
              <Trash2 size={12} />
              {t("dangerZone")}
            </button>

            {showDangerZone && (
              <div className="premium-card border-red-100 bg-red-50/10 p-6 duration-300 animate-in fade-in slide-in-from-top-2">
                <div className="mb-4 rounded-xl bg-red-50 p-3 text-[10px] font-medium text-red-800">
                  <p className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    Attention : Cette action est irréversible. Toutes les données de
                    l&apos;événement seront définitivement supprimées.
                  </p>
                </div>
                <button
                  onClick={onDeleteEvent}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-600 px-4 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-red-200 transition-all hover:bg-red-700 hover:shadow-red-300 active:scale-[0.98]"
                >
                  <Trash2 size={16} /> {t("deleteEvent")}
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 flex w-full flex-col items-center justify-center gap-6 border-t border-black/5 pt-12">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/behind-the-scenes"
                className="flex items-center gap-2 rounded-2xl bg-accent p-2 px-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                <ArrowUpRight size={14} />
                {t("behindTheScenes") || "Behind the Scenes"}
              </Link>

              <a
                href="https://www.buymeacoffee.com/colist"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-2xl bg-[#FFDD00] p-2 px-4 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-yellow-200/50 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Coffee size={14} />
                Buy Me a Coffee
              </a>

              <LanguageSelector variant="compact" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
