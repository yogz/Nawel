"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

/**
 * Skip links component for keyboard navigation accessibility
 * Allows users to skip to main content, navigation, etc.
 */
export function SkipLinks() {
  const t = useTranslations("SkipLinks");

  return (
    <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-4 focus-within:top-4 focus-within:z-[9999]">
      <nav aria-label={t("navigation") || "Skip navigation"}>
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              href="#main-content"
              className="block rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              {t("skipToContent") || "Aller au contenu principal"}
            </Link>
          </li>
          <li>
            <Link
              href="#navigation"
              className="block rounded-lg bg-gray-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2"
            >
              {t("skipToNavigation") || "Aller à la navigation"}
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
