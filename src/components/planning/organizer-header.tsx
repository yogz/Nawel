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

      <header className="sticky top-0 z-30 border-b border-white/20 bg-white/80 px-4 py-4 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl transition-all">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <AppBranding logoSize={32} className="shrink-0" variant="icon" />
            <h1 className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-xl font-black tracking-tight text-transparent drop-shadow-sm truncate">
              {plan.event?.name || "Événement"}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {readOnly && (
              <span className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-100 text-amber-700 shadow-sm">
                <ShieldAlert size={18} />
              </span>
            )}
            {!readOnly && (
              <Button
                variant="premium"
                size="premium"
                shine
                onClick={handleShare}
                icon={copied ? <CheckCircle size={18} /> : <Share size={18} />}
                iconClassName={cn(
                  "h-5 w-5 transition-all duration-300",
                  copied ? "bg-green-500 text-white rotate-12 scale-110" : "bg-transparent text-gray-700"
                )}
                className="h-10 w-10 rounded-full p-0 flex items-center justify-center shadow-lg shadow-accent/10 hover:shadow-accent/20 border border-white/40 bg-white/60"
                title={t("shareTitle")}
              >
              </Button>
            )}
            <div className="relative h-10 w-10 rounded-full overflow-hidden shadow-lg shadow-accent/10 border border-white/40 flex items-center justify-center bg-white/60">
              <UserNav />
            </div>
          </div>
        </div>

        {tab === "planning" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            {/* Citation Area */}
            <div className="mb-6 px-1">
              <CitationDisplay seed={plan.event?.name || slug} />
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
          </motion.div>
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
    <div className="mt-4 flex w-full items-center gap-3">
      <Tabs
        value={planningFilter.type}
        onValueChange={(val) => setPlanningFilter({ type: val as "all" | "unassigned" })}
        className="w-full"
      >
        <TabsList className="h-auto w-full rounded-2xl bg-gray-100/50 p-1.5 backdrop-blur-md">
          <TabsTrigger
            value="all"
            className="flex-1 gap-2 rounded-xl py-3 text-[11px] font-black uppercase tracking-wider text-gray-500 transition-all data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-[0_4px_20px_-4px_rgba(168,85,247,0.4)] sm:text-xs"
          >
            <Stars size={16} className="shrink-0" />
            <span className="truncate">{t("all")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="unassigned"
            className="flex-1 gap-2 rounded-xl py-3 text-[11px] font-black uppercase tracking-wider text-gray-500 transition-all data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-[0_4px_20px_-4px_rgba(168,85,247,0.4)] sm:text-xs"
          >
            <div className="relative">
              <CircleHelp size={16} className="shrink-0" />
              {unassignedItemsCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
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
