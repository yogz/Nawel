"use client";

import { Link } from "@/i18n/navigation";
import { LayoutDashboard } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";

/**
 * Navigation button shown on landing pages for authenticated users
 * Displays a "My Events" button that links to /event
 */
export function AuthNavButton() {
  const { data: session, isPending } = authClient.useSession();
  const t = useTranslations("Landing");

  // Don't show anything while loading or if not authenticated
  if (isPending || !session) {
    return null;
  }

  return (
    <Link
      href="/event"
      className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105 hover:bg-gray-800 hover:shadow-lg"
    >
      <LayoutDashboard className="h-4 w-4" />
      <span className="hidden sm:inline">{t("myEvents")}</span>
    </Link>
  );
}
