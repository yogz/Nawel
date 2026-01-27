"use client";

import { useTranslations } from "next-intl";
import { AppBranding } from "@/components/common/app-branding";
import { UserNav } from "@/components/auth/user-nav";

export function DashboardHeader() {
  const t = useTranslations("Dashboard");
  // Check if theme usage is needed at all?
  // It was checks for christmas. Now it's gone.
  // So we can remove the hook entirely if not used elsewhere.
  // ... checking implementation ...
  // It seems only used for christmas check.
  return (
    <div className="sticky top-0 z-30">
      <header className="header-gradient w-full px-4 pb-8 pt-6 backdrop-blur-sm transition-all duration-300 sm:px-4 sm:pb-6 sm:pt-5">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <AppBranding logoSize={40} className="shrink-0" variant="icon" href="/event" />
              <h1
                id="dashboard-title"
                className="truncate bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-xl font-black tracking-tight text-transparent drop-shadow-sm sm:text-2xl"
              >
                {t("title")}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <UserNav showLabel={true} />
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
