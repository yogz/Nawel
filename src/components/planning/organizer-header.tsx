"use client";

import { useState } from "react";
import { ShieldAlert, Share2, CheckCircle, CircleHelp, Stars } from "lucide-react";
import { type PlanData, type PlanningFilter, type Sheet } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useThemeMode } from "../theme-provider";
import { AppBranding } from "@/components/common/app-branding";
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

      <header className="bg-white/60 sticky top-0 z-30 border-b border-purple-200/30 px-4 py-4 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between">
          <AppBranding logoSize={24} className="shrink-0" variant="text-only" />
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
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-all active:scale-95"
                title={t("shareTitle")}
              >
                <Share2 size={20} className="text-gray-700" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {tab === "planning" && (
          <>
            <div className="mt-6 mb-4">
              <h1 className="text-3xl font-black tracking-tight text-text">
                {plan.event?.name || "Événement"} ✨
              </h1>
              <div className="mt-2">
                <CitationDisplay seed={plan.event?.name || "Événement"} />
              </div>
              {plan.event?.description && (
                <p className="mt-2 text-sm text-text/70">
                  {plan.event.description}
                </p>
              )}
            </div>
            <PlanningFilters
              plan={plan}
              planningFilter={planningFilter}
              setPlanningFilter={setPlanningFilter}
              setSheet={setSheet}
              sheet={sheet}
              unassignedItemsCount={unassignedItemsCount}
              slug={slug}
              writeKey={writeKey}
              readOnly={readOnly}
            />
          </>
        )}
      </header>
    </>
  );
}

interface PlanningFiltersProps {
  plan: PlanData;
  planningFilter: PlanningFilter;
  setPlanningFilter: (filter: PlanningFilter) => void;
  setSheet: (sheet: Sheet) => void;
  sheet: Sheet | null;
  unassignedItemsCount: number;
  slug: string;
  writeKey?: string;
  readOnly: boolean;
}

function PlanningFilters({
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
    <div className="mt-3 flex items-center justify-center">
      <Tabs
        value={planningFilter.type}
        onValueChange={(val) => setPlanningFilter({ type: val as "all" | "unassigned" })}
        className="inline-flex"
      >
        <TabsList className="h-auto rounded-xl bg-white/70 p-1 backdrop-blur-sm border border-white/50 shadow-sm">
          <TabsTrigger
            value="all"
            className="gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-sm transition-all sm:text-[11px]"
          >
            <Stars size={14} className="shrink-0" />
            <span className="truncate">{t("all")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="unassigned"
            className="gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-sm transition-all sm:text-[11px]"
          >
            <CircleHelp size={14} className="shrink-0" />
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
