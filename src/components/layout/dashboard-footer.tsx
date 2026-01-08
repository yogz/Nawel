"use client";

import { useTranslations } from "next-intl";

export function DashboardFooter() {
  const t = useTranslations("Dashboard");

  return (
    <footer className="mt-8 py-6 text-center">
      <button
        onClick={() => {
          window.dispatchEvent(new Event("start-tour-dashboard"));
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="text-xs font-medium text-gray-400 decoration-gray-300 underline-offset-2 transition-colors hover:text-gray-600 hover:underline"
      >
        {t("replayTour")}
      </button>
    </footer>
  );
}
