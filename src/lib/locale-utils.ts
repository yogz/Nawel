import type { Locale } from "@/i18n/routing";

/**
 * Converts a Next-Intl locale to Open Graph locale format
 * @param locale - The locale from next-intl (e.g., "fr", "en", "es")
 * @returns Open Graph locale format (e.g., "fr_FR", "en_US", "es_ES")
 */
export function toOpenGraphLocale(locale: string): string {
  const localeMap: Record<string, string> = {
    fr: "fr_FR",
    en: "en_US",
    es: "es_ES",
    pt: "pt_PT",
    de: "de_DE",
    el: "el_GR",
    it: "it_IT",
    nl: "nl_NL",
    pl: "pl_PL",
    sv: "sv_SE",
    da: "da_DK",
  };

  return localeMap[locale] || "fr_FR";
}

/**
 * Gets alternative Open Graph locales for multilingual content
 * @param currentLocale - The current locale
 * @returns Array of alternative locales in Open Graph format
 */
export function getAlternateOpenGraphLocales(currentLocale: string): string[] {
  const allLocales = ["fr", "en", "es", "pt", "de", "el", "it", "nl", "pl", "sv", "da"];
  return allLocales
    .filter((locale) => locale !== currentLocale)
    .map((locale) => toOpenGraphLocale(locale));
}
