"use client";

import { useState, useMemo } from "react";
import { Globe, Check, Search } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { useSession } from "@/lib/auth-client";
import { updateUserAction } from "@/app/actions/user-actions";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "../ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";

// Language metadata with flags and native names
const LANGUAGE_META: Record<string, { flag: string; nativeName: string; region: string }> = {
  fr: { flag: "🇫🇷", nativeName: "Français", region: "Western Europe" },
  en: { flag: "🇬🇧", nativeName: "English", region: "Global" },
  es: { flag: "🇪🇸", nativeName: "Español", region: "Southern Europe" },
  pt: { flag: "🇵🇹", nativeName: "Português", region: "Southern Europe" },
  de: { flag: "🇩🇪", nativeName: "Deutsch", region: "Western Europe" },
  el: { flag: "🇬🇷", nativeName: "Ελληνικά", region: "Southern Europe" },
  it: { flag: "🇮🇹", nativeName: "Italiano", region: "Southern Europe" },
  nl: { flag: "🇳🇱", nativeName: "Nederlands", region: "Western Europe" },
  pl: { flag: "🇵🇱", nativeName: "Polski", region: "Eastern Europe" },
  sv: { flag: "🇸🇪", nativeName: "Svenska", region: "Northern Europe" },
  da: { flag: "🇩🇰", nativeName: "Dansk", region: "Northern Europe" },
};

interface LanguageSelectorProps {
  variant?: "compact" | "grid" | "bottomSheet";
  showSearch?: boolean;
  className?: string;
}

export function LanguageSelector({
  variant = "grid",
  showSearch = true,
  className = "",
}: LanguageSelectorProps) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = async (newLocale: Locale) => {
    if (typeof window === "undefined") {
      return;
    }

    // Save to user profile if logged in
    if (session?.user) {
      try {
        await updateUserAction({
          language: newLocale,
        });
      } catch (err) {
        console.error("Failed to save language preference:", err);
      }
    }

    // Use next-intl router for robust locale switching
    router.replace(
      { pathname, query: Object.fromEntries(searchParams.entries()) },
      { locale: newLocale }
    );

    setIsOpen(false);
    setSearchQuery("");
  };

  const filteredLocales = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return routing.locales.filter((l) => {
      const meta = LANGUAGE_META[l];
      const translatedName = t(`languages.${l}`).toLowerCase();
      return (
        meta?.nativeName.toLowerCase().includes(query) ||
        translatedName.includes(query) ||
        l.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, t]);

  // Bottom Sheet variant - Mobile-first
  if (variant === "bottomSheet") {
    return (
      <div className={className}>
        {/* Trigger button */}
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
          aria-label="Changer la langue"
        >
          <span className="text-lg">{LANGUAGE_META[locale]?.flag}</span>
          <span className="text-xs font-bold">{LANGUAGE_META[locale]?.nativeName}</span>
        </button>

        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="px-4 pb-32">
            <DrawerHeader className="px-0 text-left">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-xs font-black uppercase tracking-widest text-gray-400">
                  {t("chooseLanguage") || "Choisir une langue"}
                </DrawerTitle>
                <DrawerClose asChild>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className="rounded-full bg-gray-100 p-1.5 text-gray-500 transition-colors hover:bg-gray-200 active:scale-95"
                    aria-label={t("close") || "Fermer"}
                  >
                    <Globe size={14} />
                  </button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div className="space-y-4">
              {/* Search (if many languages) */}
              {showSearch && routing.locales.length > 6 && (
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder={t("searchPlaceholder") || "Rechercher..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-gray-100 bg-gray-50/50 py-2.5 pl-10 pr-3 text-sm focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
                    aria-label="Rechercher une langue"
                  />
                </div>
              )}

              {/* Language grid */}
              <div className="no-scrollbar max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2 pb-2">
                  {filteredLocales.map((l) => (
                    <button
                      key={l}
                      onClick={() => handleLanguageChange(l as Locale)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl p-3 text-left transition-all active:scale-95",
                        locale === l
                          ? "bg-accent/10 ring-2 ring-accent/30"
                          : "bg-gray-50 hover:bg-gray-100"
                      )}
                      aria-label={`Sélectionner ${LANGUAGE_META[l]?.nativeName}`}
                    >
                      <span className="text-2xl">{LANGUAGE_META[l]?.flag}</span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm font-bold",
                            locale === l ? "text-accent" : "text-gray-800"
                          )}
                        >
                          {LANGUAGE_META[l]?.nativeName}
                        </p>
                      </div>
                      {locale === l && <Check size={16} className="shrink-0 text-accent" />}
                    </button>
                  ))}
                </div>
                {filteredLocales.length === 0 && (
                  <div className="py-8 text-center text-sm text-gray-500">
                    {t("noLanguageFound") || "Aucune langue trouvée"}
                  </div>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95",
              className
            )}
            aria-label="Changer la langue"
          >
            <Globe size={16} />
            <span className="text-lg">{LANGUAGE_META[locale]?.flag}</span>
            <span className="hidden sm:inline">{LANGUAGE_META[locale]?.nativeName}</span>
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-72 rounded-2xl p-0 shadow-xl" sideOffset={8}>
          {showSearch && routing.locales.length > 6 && (
            <div className="border-b border-gray-100 p-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder") || "Search languages..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>
          )}
          <div className="max-h-96 overflow-y-auto p-2">
            {filteredLocales.map((l) => (
              <button
                key={l}
                onClick={() => handleLanguageChange(l as Locale)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all active:scale-95",
                  locale === l ? "bg-accent/10 text-accent" : "hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{LANGUAGE_META[l]?.flag}</span>
                  <div>
                    <p className="text-sm font-semibold">{LANGUAGE_META[l]?.nativeName}</p>
                    <p className="text-xs text-gray-500">{t(`languages.${l}`)}</p>
                  </div>
                </div>
                {locale === l && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                    <Check size={12} />
                  </div>
                )}
              </button>
            ))}
            {filteredLocales.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                {t("noLanguageFound") || "No languages found"}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Grid variant for settings page
  return (
    <div className={`space-y-4 ${className}`}>
      {showSearch && routing.locales.length > 6 && (
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={`${t("languages.fr")} recherche...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filteredLocales.map((l) => (
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
              <span className="text-2xl">{LANGUAGE_META[l]?.flag}</span>
              <div className="text-left">
                <p className="text-sm font-bold text-text">{LANGUAGE_META[l]?.nativeName}</p>
                <p className="text-xs text-gray-500">{t(`languages.${l}`)}</p>
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
      {filteredLocales.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
          Aucune langue trouvée
        </div>
      )}
    </div>
  );
}
