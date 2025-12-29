"use client";

import { Trash2, Sparkles, Check, Globe } from "lucide-react";
import { useThemeMode } from "@/components/theme-provider";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";

interface SettingsTabProps {
  onDeleteEvent: () => void;
  readOnly: boolean;
}

export function SettingsTab({ onDeleteEvent, readOnly }: SettingsTabProps) {
  const t = useTranslations("EventDashboard.Settings");
  const tCommon = useTranslations("common");
  const { theme, setTheme, themes } = useThemeMode();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleLanguageChange = (newLocale: Locale) => {
    // Preserve query params (like edit key) when changing language
    const searchString = searchParams.toString();
    const href = searchString ? `${pathname}?${searchString}` : pathname;
    router.replace(href, { locale: newLocale });
  };

  const languageIcons: Record<string, string> = {
    fr: "🇫🇷",
    en: "🇬🇧",
    es: "🇪🇸",
    pt: "🇵🇹",
    de: "🇩🇪",
    el: "🇬🇷",
  };

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {routing.locales.map((l) => (
            <button
              key={l}
              onClick={() => handleLanguageChange(l as Locale)}
              className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                locale === l
                  ? "border-accent/30 bg-accent/10 ring-2 ring-accent/20"
                  : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{languageIcons[l] || "🌐"}</span>
                <div className="text-left">
                  <p className="text-sm font-bold text-text">{tCommon(`languages.${l}`)}</p>
                </div>
              </div>
              {locale === l && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white">
                  <Check size={14} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {!readOnly && (
        <div className="premium-card border-red-100 bg-red-50/10 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-red-900/40">
            <Trash2 size={14} /> {t("dangerZone")}
          </h3>
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
  );
}
