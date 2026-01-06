"use client";

import { useThemeMode } from "@/components/theme-provider";
import { useTranslations } from "next-intl";
import { AppBranding } from "@/components/common/app-branding";
import { UserNav } from "@/components/auth/user-nav";

export function DashboardHeader() {
  const t = useTranslations("Dashboard");
  const { theme } = useThemeMode();

  return (
    <>
      {theme === "christmas" && (
        <div className="christmas-garland">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="christmas-light" />
          ))}
        </div>
      )}

      <div className="sticky top-0 z-30">
        <header
          style={{
            background: `linear-gradient(to bottom, var(--header-fade) 0%, var(--header-fade) 30%, rgba(255, 255, 255, 0) 100%)`,
          }}
          className="w-full px-4 pb-8 pt-6 backdrop-blur-sm transition-all duration-300 sm:px-4 sm:pb-6 sm:pt-5"
        >
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <AppBranding logoSize={40} className="shrink-0" variant="icon" />
                <h1 className="truncate bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-xl font-black tracking-tight text-transparent drop-shadow-sm sm:text-2xl">
                  {t("title")}
                </h1>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-white/60 shadow-lg shadow-accent/10 transition-all duration-300 hover:shadow-xl hover:shadow-accent/15 sm:h-10 sm:w-10">
                  <UserNav />
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
