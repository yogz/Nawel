"use client";

import { useState } from "react";
import { ShieldAlert, Share, CheckCircle, CircleHelp, Stars } from "lucide-react";
import { type PlanData, type PlanningFilter, type Sheet } from "@/lib/types";
import { UserNav } from "@/components/auth/user-nav";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useThemeMode } from "../theme-provider";
import { AppBranding } from "@/components/common/app-branding";

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
          <AppBranding logoSize={32} className="shrink-0" variant="text-only" />
          <div className="flex items-center gap-2">
            {readOnly && (
              <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600 sm:gap-1.5 sm:px-3 sm:text-[11px]">
                <ShieldAlert size={10} className="sm:h-3 sm:w-3" />
                <span className="xs:inline hidden">{t("mirrorBadge")}</span>
              </span>
            )}
            {!readOnly && (
              <Button
                variant="premium"
                size="premium"
                shine
                onClick={handleShare}
                icon={copied ? <CheckCircle size={14} /> : <Share size={14} />}
                iconClassName={cn("h-7 w-7", copied && "bg-green-500 text-white")}
                title={t("shareTitle")}
              >
                <span className="truncate text-[10px] font-black uppercase tracking-wider text-gray-700 sm:text-xs">
                  {copied ? t("copyButton") : t("shareButton")}
                </span>
              </Button>
            )}
            <UserNav />
          </div>
        </div>

        {tab === "planning" && (
          <>
            <div className="mt-6 mb-4">
              <h1 className="text-3xl font-black tracking-tight text-text">
                {plan.event?.name || "Événement"} ✨
              </h1>
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
    <div className="mt-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 w-full">
        <Tabs
          value={planningFilter.type}
          onValueChange={(val) => setPlanningFilter({ type: val as "all" | "unassigned" })}
          className="w-full"
        >
          <TabsList className="h-auto w-full rounded-2xl bg-white/60 p-1.5 backdrop-blur-sm border border-white/40 shadow-sm">
            <TabsTrigger
              value="all"
              className="flex-1 gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-md transition-all sm:text-xs"
            >
              <Stars size={16} className="shrink-0" />
              <span className="truncate">{t("all")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="unassigned"
              className="flex-1 gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-md transition-all sm:text-xs"
            >
              <CircleHelp size={16} className="shrink-0" />
              <span className="truncate">
                {t("unassigned", {
                  count: unassignedItemsCount,
                })}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
