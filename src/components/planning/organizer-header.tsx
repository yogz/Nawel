"use client";

import { useState } from "react";
import { ShieldAlert, Share, CheckCircle, CircleHelp, Stars } from "lucide-react";
import { type PlanData, type PlanningFilter, type Sheet } from "@/lib/types";
import { UserNav } from "@/components/auth/user-nav";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { useThemeMode } from "../theme-provider";
import { AppBranding } from "@/components/common/app-branding";
import { motion } from "framer-motion";
import { CitationDisplay } from "../common/citation-display";

interface OrganizerHeaderProps {
  readOnly: boolean;
  tab: string;
  plan: PlanData;
  planningFilter: PlanningFilter;
  setPlanningFilter: (filter: PlanningFilter) => void;
  setSheet: (sheet: Sheet) => void;
  sheet: Sheet | null;
  unassignedItemsCount: number;
  slug: string;
  writeKey?: string;
}

export function OrganizerHeader({
  readOnly,
  tab,
  plan,
  planningFilter,
  setPlanningFilter,
  setSheet,
  sheet,
  unassignedItemsCount,
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

      <div className="sticky top-0 z-30">
        <header
          style={{
            background: `linear-gradient(to bottom, var(--header-fade) 0%, var(--header-fade) 60%, transparent 100%)`,
          }}
          className="w-full px-4 pb-12 pt-4 backdrop-blur-sm transition-all"
        >
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <AppBranding logoSize={20} className="shrink-0" variant="icon" />
                <h1 className="truncate bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-lg font-black tracking-tight text-transparent drop-shadow-sm">
                  {plan.event?.name || "Événement"}
                </h1>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {readOnly && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-sm">
                    <ShieldAlert size={14} />
                  </span>
                )}
                {!readOnly && (
                  <Button
                    variant="premium"
                    shine
                    onClick={handleShare}
                    className="h-8 w-8 rounded-full border border-white/50 p-0 shadow-lg shadow-accent/5 backdrop-blur-sm transition-all hover:scale-110 hover:shadow-accent/20 active:scale-95"
                    icon={
                      copied ? (
                        <CheckCircle
                          size={16}
                          className="text-green-500 duration-300 animate-in zoom-in spin-in-12 group-hover:text-white"
                        />
                      ) : (
                        <Share size={16} className="text-gray-700 group-hover:text-white" />
                      )
                    }
                    iconClassName="h-full w-full bg-white group-hover:bg-accent"
                    title={t("shareTitle")}
                  />
                )}
                <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-white/60 shadow-lg shadow-accent/10">
                  <UserNav />
                </div>
              </div>
            </div>

            {tab === "planning" && (
              <div className="mt-1">
                <div className="px-0.5 pb-0.5">
                  <CitationDisplay seed={plan.event?.name || slug} className="text-[10px]" />
                </div>
              </div>
            )}
          </div>
        </header>
      </div>
    </>
  );
}

export interface PlanningFiltersProps {
  plan: PlanData;
  planningFilter: PlanningFilter;
  setPlanningFilter: (filter: PlanningFilter) => void;
  setSheet: (set: Sheet) => void;
  sheet: Sheet | null;
  unassignedItemsCount: number;
  slug: string;
  writeKey?: string;
  readOnly: boolean;
}

export function PlanningFilters({
  plan,
  planningFilter,
  setPlanningFilter,
  setSheet,
  sheet,
  unassignedItemsCount,
  slug,
  writeKey,
  readOnly,
}: PlanningFiltersProps) {
  const t = useTranslations("EventDashboard.Header.filter");

  return (
    <div className="mb-2 flex w-full items-center justify-center">
      <Tabs
        value={planningFilter.type}
        onValueChange={(val) => setPlanningFilter({ type: val as "all" | "unassigned" })}
        className="w-full max-w-[280px]"
      >
        <TabsList className="h-9 w-full rounded-full border border-white/20 bg-gray-200/30 p-1 backdrop-blur-md">
          <TabsTrigger
            value="all"
            className="flex-1 gap-1.5 rounded-full py-1.5 text-[9px] font-black uppercase tracking-tight text-gray-400 transition-all data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-sm sm:text-xs"
          >
            <Stars size={12} className="shrink-0" />
            <span className="truncate">{t("all")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="unassigned"
            className="flex-1 gap-1.5 rounded-full py-1.5 text-[9px] font-black uppercase tracking-tight text-gray-400 transition-all data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-sm sm:text-xs"
          >
            <div className="relative">
              <CircleHelp size={12} className="shrink-0" />
              {unassignedItemsCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500"></span>
                </span>
              )}
            </div>
            <span className="truncate">
              {t("unassigned", {
                count: unassignedItemsCount,
              })}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
