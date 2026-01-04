"use client";

import { useState } from "react";
import { ShieldAlert, Share2, Settings, User } from "lucide-react";
import { type PlanData } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useThemeMode } from "../theme-provider";
import { AppBranding } from "@/components/common/app-branding";
import { CitationDisplay } from "../common/citation-display";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface OrganizerHeaderProps {
  readOnly: boolean;
  tab: string;
  plan: PlanData;
  slug: string;
  writeKey?: string;
  userImage?: string | null;
  isAuthenticated?: boolean;
  onOpenSettings?: () => void;
}

export function OrganizerHeader({
  readOnly,
  tab,
  plan,
  slug,
  writeKey,
  userImage,
  isAuthenticated,
  onOpenSettings,
}: OrganizerHeaderProps) {
  const { theme } = useThemeMode();
  const t = useTranslations("EventDashboard.Header");
  const tSettings = useTranslations("EventDashboard.Settings");
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
        className="sticky top-0 z-30 border-b border-purple-200/30 px-4 py-1.5 shadow-sm"
        style={{
          background: "rgba(255, 255, 255, 0.3)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppBranding logoSize={18} className="shrink-0" variant="icon-only" />
            {tab === "planning" && (
              <h1 className="text-xl font-black tracking-tight text-text">
                {plan.event?.name || "Événement"} ✨
              </h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            {readOnly && (
              <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600 sm:gap-1.5 sm:px-3 sm:text-[11px]">
                <ShieldAlert size={10} className="sm:h-3 sm:w-3" />
                <span className="xs:inline hidden">{t("mirrorBadge")}</span>
              </span>
            )}
            {!readOnly && (
              <>
                <button
                  onClick={handleShare}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition-all hover:shadow-md active:scale-95"
                  title={t("shareTitle")}
                >
                  <Share2 size={16} className="text-gray-700" strokeWidth={2.5} />
                </button>
              </>
            )}

            {/* Profile button */}
            {isAuthenticated && onOpenSettings && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm transition-all hover:shadow-md active:scale-95"
                    title="Profil"
                  >
                    {userImage ? (
                      <img src={userImage} alt="Profil" className="h-full w-full object-cover" />
                    ) : (
                      <User size={16} className="text-gray-700" strokeWidth={2.5} />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <button
                    onClick={onOpenSettings}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Settings size={14} />
                    {tSettings("title")}
                  </button>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {tab === "planning" && (plan.event?.description || plan.event?.name) && (
          <div className="mb-1.5 mt-2">
            <div className="mt-0.5">
              <CitationDisplay seed={plan.event?.name || "Événement"} />
            </div>
            {plan.event?.description && (
              <p className="text-text/70 mt-0.5 text-xs">{plan.event.description}</p>
            )}
          </div>
        )}
      </header>
    </>
  );
}
