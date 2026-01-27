"use client";

import { useTranslations } from "next-intl";
import { AppBranding } from "../common/app-branding";

export function DashboardFooter() {
  const t = useTranslations("Dashboard");

  return (
    <footer className="mt-8 py-6 text-center space-y-6">
      <div className="flex justify-center">
        <AppBranding logoSize={24} variant="icon-text" noLink />
      </div>
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
