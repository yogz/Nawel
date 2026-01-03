"use client";

import { useThemeMode } from "@/components/theme-provider";
import { useTranslations } from "next-intl";
import { AppBranding } from "@/components/common/app-branding";
import { UserNav } from "@/components/auth/user-nav";

export function DashboardHeader() {
  const t = useTranslations("Dashboard");
  const { theme } = useThemeMode();

  const getEmoji = (type: "badge" | "title") => {
    if (type === "badge") {
      return theme === "christmas" ? " 🎄" : "";
    }
    return theme === "aurora" ? " ✨" : theme === "christmas" ? " 🎁" : "";
  };

  return (
    <div className="mb-8 pt-4">
      <div className="mb-8 flex items-center justify-between">
        <AppBranding logoSize={40} textSize="lg" />
        <UserNav />
      </div>
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
          {t("badge")}
          {getEmoji("badge")}
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          {t("title")}
          {getEmoji("title")}
        </h1>
        <p className="mt-2 text-gray-600">{t("description")}</p>
      </div>
    </div>
  );
}
