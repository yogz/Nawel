"use client";

import { useLocale, useTranslations } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Languages, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const localeNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  pt: "Português",
  de: "Deutsch",
  el: "Ελληνικά",
};

export function LanguageSwitcher() {
  const t = useTranslations("Landing");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Convert searchParams to object for next-intl Link query prop
  const query: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    query[key] = value;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-md transition-all hover:bg-white/20"
        aria-label="Select language"
      >
        <Languages className="h-4 w-4 text-white/70 transition-colors group-hover:text-white" />
        <span className="text-sm font-medium uppercase text-white/90">{locale}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-white/50 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-xl"
          >
            <div className="py-1">
              {routing.locales.map((cur) => (
                <Link
                  key={cur}
                  href={href}
                  locale={cur}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex w-full items-center px-4 py-2 text-sm transition-colors",
                    cur === locale
                      ? "bg-white/10 font-semibold text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className="flex-1 text-left">{localeNames[cur]}</span>
                  {cur === locale && (
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                  )}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
