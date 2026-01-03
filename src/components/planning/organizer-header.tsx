"use client";

import { useState } from "react";
import { ShieldAlert, Share2 } from "lucide-react";
import { type PlanData } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useThemeMode } from "../theme-provider";
import { AppBranding } from "@/components/common/app-branding";
import { CitationDisplay } from "../common/citation-display";

interface OrganizerHeaderProps {
  readOnly: boolean;
  tab: string;
  plan: PlanData;
  slug: string;
  writeKey?: string;
}

export function OrganizerHeader({
  readOnly,
  tab,
  plan,
  slug,
  writeKey,
}: OrganizerHeaderProps) {
  const { theme } = useThemeMode();
  const t = useTranslations("EventDashboard.Header");
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${baseUrl}/event/${slug}${writeKey ? `?key=${writeKey}` : ""}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: t("shareNavigatorTitle", { name: plan.event?.name || slug }),
          text: t("shareNavigatorText", { name: plan.event?.name || slug }),
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {theme === "christmas" && (
        <div className="christmas-garland">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="christmas-light" />
          ))}
        </div>
      )}

      {readOnly && (
        <div className="flex items-center gap-2 bg-amber-100 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert size={16} />
          {t("readOnlyWarning")}
        </div>
      )}

      <header
        className="sticky top-0 z-30 border-b border-purple-200/30 px-4 py-2 shadow-sm"
        style={{
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center justify-between">
          <AppBranding logoSize={20} className="shrink-0" variant="text-only" />
          <div className="flex items-center gap-2">
            {readOnly && (
              <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600 sm:gap-1.5 sm:px-3 sm:text-[11px]">
                <ShieldAlert size={10} className="sm:h-3 sm:w-3" />
                <span className="xs:inline hidden">{t("mirrorBadge")}</span>
              </span>
            )}
            {!readOnly && (
              <button
                onClick={handleShare}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-all active:scale-95"
                title={t("shareTitle")}
              >
                <Share2 size={18} className="text-gray-700" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {tab === "planning" && (
          <div className="mt-3 mb-2">
            <h1 className="text-2xl font-black tracking-tight text-text">
              {plan.event?.name || "Événement"} ✨
            </h1>
            <div className="mt-1">
              <CitationDisplay seed={plan.event?.name || "Événement"} />
            </div>
            {plan.event?.description && (
              <p className="mt-1 text-sm text-text/70">
                {plan.event.description}
              </p>
            )}
          </div>
        )}
      </header>
    </>
  );
}
