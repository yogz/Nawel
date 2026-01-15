"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Share,
  CheckCircle,
  CircleHelp,
  Stars,
  Calendar,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import { type PlanData, type PlanningFilter, type Sheet } from "@/lib/types";
import { UserNav } from "@/components/auth/user-nav";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { useThemeMode } from "../theme-provider";
import { AppBranding } from "@/components/common/app-branding";
import { CitationDisplay } from "../common/citation-display";
import { Link } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { AutoSizeText } from "@/components/common/auto-size-text";

interface EventPlannerHeaderProps {
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

export function EventPlannerHeader({
  readOnly,
  tab,
  plan,
  planningFilter: _planningFilter,
  setPlanningFilter: _setPlanningFilter,
  setSheet: _setSheet,
  sheet: _sheet,
  unassignedItemsCount: _unassignedItemsCount,
  slug,
  writeKey,
}: EventPlannerHeaderProps) {
  const { theme } = useThemeMode();
  const t = useTranslations("EventDashboard.Header");
  const tShared = useTranslations("EventDashboard.Shared");
  const [copied, setCopied] = useState(false);
  const [showAttention, setShowAttention] = useState(true);
  const [showLogoHint, setShowLogoHint] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [animationStep, setAnimationStep] = useState<"logo" | "home" | "arrow">("logo");
  const [animationComplete, setAnimationComplete] = useState(false);

  // Stop the attention-grabbing effect after 2 minutes
  useEffect(() => {
    const timer = setTimeout(() => setShowAttention(false), 2 * 60 * 1000);
    return () => clearTimeout(timer);
  }, []);

  // Animation sequence: Logo -> Home -> Arrow -> Logo (douce et subtile)
  useEffect(() => {
    if (!showLogoHint) {
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    timers.push(
      setTimeout(() => setAnimationStep("home"), 1200),
      setTimeout(() => setAnimationStep("arrow"), 2400),
      setTimeout(() => {
        setAnimationStep("logo");
        // Attendre la fin de la transition du logo avant de désactiver
        setTimeout(() => {
          setShowLogoHint(false);
          setAnimationComplete(true);
        }, 700);
      }, 3600)
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [showLogoHint]);

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
            background: `linear-gradient(to bottom, var(--header-fade) 0%, var(--header-fade) 30%, rgba(255, 255, 255, 0) 100%)`,
          }}
          className="w-full px-2 pb-8 pt-5 backdrop-blur-sm transition-all sm:px-2 sm:pb-6 sm:pt-4"
        >
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col gap-6">
              {/* Top Row: Navigation & Actions */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Link
                    href="/event"
                    aria-label="Retour à l'accueil"
                    className="relative block shrink-0 rounded-full bg-white/40 p-2 shadow-sm backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/60 active:scale-95"
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                  >
                    <div className="relative h-5 w-5 sm:h-6 sm:w-6">
                      <AnimatePresence mode="wait">
                        {hovered ? (
                          <motion.div
                            key="home"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <Home className="h-full w-full text-accent" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="arrow"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <ArrowLeft className="h-full w-full text-gray-700" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Link>
                  <AppBranding
                    logoSize={24}
                    textSize="sm"
                    className="opacity-80 mix-blend-multiply"
                  />
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {!readOnly && (
                    <Button
                      variant="premium"
                      onClick={handleShare}
                      className={cn(
                        "h-10 w-10 rounded-full border border-white/50 p-0 shadow-lg shadow-accent/5 backdrop-blur-sm transition-all hover:scale-110 hover:shadow-accent/20 active:scale-95",
                        showAttention && "btn-shine-attention"
                      )}
                      icon={
                        copied ? (
                          <CheckCircle
                            size={16}
                            className="text-green-500 duration-300 animate-in zoom-in spin-in-12"
                          />
                        ) : (
                          <Share size={16} className="text-gray-700" />
                        )
                      }
                      title={t("shareTitle")}
                    />
                  )}
                  <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-white/60 shadow-lg shadow-accent/10">
                    <UserNav />
                  </div>
                </div>
              </div>

              {/* Middle Row: Event Title (Massive) */}
              <div className="px-1">
                <AutoSizeText
                  maxSize={48}
                  minSize={20}
                  className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text font-black tracking-tighter text-transparent drop-shadow-sm"
                >
                  {plan.event?.name || tShared("defaultEventName")}
                </AutoSizeText>
              </div>

              {/* Bottom Row: Logistic Pills (Glassmorphic) */}
              {plan.meals.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-1 text-sm font-medium">
                  {/* Date Pill */}
                  <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1.5 shadow-sm backdrop-blur-md transition-transform hover:scale-105 text-gray-700">
                    <Calendar size={14} className="text-accent" />
                    <span>
                      {new Date(plan.meals[0].date).toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>

                  {/* Time Pill (if distinct) */}
                  {plan.meals[0].time && (
                    <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1.5 shadow-sm backdrop-blur-md transition-transform hover:scale-105 text-gray-700">
                      <Clock size={14} className="text-accent" />
                      <span>{plan.meals[0].time}</span>
                    </div>
                  )}

                  {/* Address Pill */}
                  {plan.meals[0].address && (
                    <div className="flex max-w-[150px] items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1.5 shadow-sm backdrop-blur-md transition-transform hover:scale-105 text-gray-700 sm:max-w-[200px]">
                      <MapPin size={14} className="shrink-0 text-accent" />
                      <span className="truncate">{plan.meals[0].address}</span>
                    </div>
                  )}

                  {/* Guests Pill */}
                  <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1.5 shadow-sm backdrop-blur-md transition-transform hover:scale-105 text-gray-700">
                    <Users size={14} className="text-accent" />
                    <span>
                      <span className="font-bold text-gray-900">{plan.people.length}</span>
                      <span className="text-gray-500">
                        {" "}
                        / {(plan.event?.adults || 0) + (plan.event?.children || 0)}
                      </span>
                    </span>
                  </div>

                  {/* Vacation Count (if multiple meals) */}
                  {plan.meals.length > 1 && (
                    <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-accent font-bold shadow-sm backdrop-blur-md">
                      <span className="text-xs">{plan.meals.length} jours</span>
                    </div>
                  )}
                </div>
              )}
            </div>
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
  plan: _plan,
  planningFilter,
  setPlanningFilter,
  setSheet: _setSheet,
  sheet: _sheet,
  unassignedItemsCount,
  slug: _slug,
  writeKey: _writeKey,
  readOnly: _readOnly,
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
            className="flex-1 gap-1.5 rounded-full py-1.5 text-xs font-black uppercase tracking-tight text-gray-400 transition-all data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-sm sm:text-[9px]"
          >
            <Stars size={12} className="shrink-0" />
            <span className="truncate">{t("all")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="unassigned"
            className="flex-1 gap-1.5 rounded-full py-1.5 text-xs font-black uppercase tracking-tight text-gray-400 transition-all data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-sm sm:text-[9px]"
          >
            <div className="relative">
              <CircleHelp size={12} className="shrink-0" />
              {unassignedItemsCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
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
