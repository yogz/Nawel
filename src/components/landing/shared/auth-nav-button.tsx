"use client";

import { useState, useEffect } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't show anything while loading, if not authenticated, or before hydration
  if (!mounted || isPending || !session) {
    return null;
  }

  return (
    <Link
      href="/event"
      className="flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all hover:scale-105 hover:brightness-110 active:scale-95"
    >
      <LayoutDashboard size={18} />
      <span className="whitespace-nowrap">{t("myEvents")}</span>
    </Link>
  );
}
