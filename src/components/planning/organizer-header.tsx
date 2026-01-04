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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppBranding logoSize={32} className="shrink-0" variant="text-only" />
          </div>
          <div className="flex items-center gap-2">
            {readOnly && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 shadow-sm">
                <ShieldAlert size={12} />
                <span className="hidden xs:inline">{t("mirrorBadge")}</span>
              </span>
            )}
            {!readOnly && (
              <Button
                variant="premium"
                size="premium"
                shine
                onClick={handleShare}
                icon={copied ? <CheckCircle size={14} /> : <Share size={14} />}
                iconClassName={cn(
                  "h-8 w-8 transition-all duration-300",
                  copied ? "bg-green-500 text-white rotate-12 scale-110" : "bg-accent text-white"
                )}
                className="shadow-lg shadow-accent/20 hover:shadow-accent/30"
                title={t("shareTitle")}
              >
                <span className="hidden sm:inline text-[11px] font-black uppercase tracking-wider text-gray-700">
                  {copied ? t("copyButton") : t("shareButton")}
                </span>
                <span className="sm:hidden text-[11px] font-black uppercase tracking-wider text-gray-700">
                  {copied ? "Copié" : "Partager"}
                </span>
              </Button>
            )}
            <UserNav />
          </div>
        </div>

        {tab === "planning" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 mb-2"
          >
            <div className="mb-6">
              <h1 className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-4xl font-black tracking-tighter text-transparent drop-shadow-sm sm:text-5xl">
                {plan.event?.name || "Événement"}
                <span className="ml-2 inline-block animate-pulse text-3xl sm:text-4xl">✨</span>
              </h1>
              {plan.event?.description && (
                <p className="mt-2 text-base font-medium text-gray-500 max-w-lg leading-relaxed">
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
