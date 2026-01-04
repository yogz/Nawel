"use client";

import { useState } from "react";
import { Trash2, Sparkles, Globe, Check, ChevronRight, ChevronDown } from "lucide-react";
import { useThemeMode } from "@/components/theme-provider";
import { useTranslations } from "next-intl";
import { LanguageSelector } from "@/components/common/language-selector";

interface SettingsTabProps {
  onDeleteEvent: () => void;
  readOnly: boolean;
}

export function SettingsTab({ onDeleteEvent, readOnly }: SettingsTabProps) {
  const t = useTranslations("EventDashboard.Settings");
  const tShared = useTranslations("EventDashboard.Shared");
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
        <LanguageSelector variant="grid" showSearch={true} />
      </div>

      {!readOnly && (
        <div className="space-y-3">
          <button
            onClick={() => setShowDangerZone(!showDangerZone)}
            className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-white/50 px-6 py-4 text-sm font-bold text-gray-400 transition-all hover:bg-white"
          >
            <div className="flex items-center gap-2">
              <Trash2 size={14} />
              {t("dangerZone")}
            </div>
            {showDangerZone ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {showDangerZone && (
            <div className="premium-card border-red-100 bg-red-50/10 p-6 duration-300 animate-in fade-in slide-in-from-top-2">
              <button
                onClick={onDeleteEvent}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-black uppercase tracking-widest text-red-600 transition-all hover:bg-red-100"
              >
                <Trash2 size={16} /> {t("deleteEvent")}
              </button>
              <p className="mt-3 text-center text-[10px] font-medium text-red-900/40">
                {t("irreversible")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
