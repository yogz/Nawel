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
      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
    >
      <LayoutDashboard size={16} />
      <span>{t("myEvents")}</span>
    </Link>
  );
}
