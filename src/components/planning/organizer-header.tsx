"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Share, CheckCircle, CircleHelp, Stars } from "lucide-react";
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
  // Theme hook removed as it was only used for Christmas garland
  const t = useTranslations("EventDashboard.Header");
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
    if (!showLogoHint) return;

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
          className="w-full px-4 pb-8 pt-5 backdrop-blur-sm transition-all sm:px-4 sm:pb-6 sm:pt-4"
        >
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <Link
                  href="/"
                  aria-label="Retour à l'accueil"
                  className="relative block shrink-0 rounded-lg transition-all duration-300 hover:bg-accent/10"
                  onMouseEnter={() => setHovered(true)}
                  onMouseLeave={() => setHovered(false)}
                >
                  <div className="relative h-9 w-9 sm:h-9 sm:w-9">
                    <AnimatePresence mode="wait">
                      {hovered && animationComplete ? (
                        // Hover effect: show home icon with smooth fade (seulement après la fin de l'animation)
                        <motion.div
                          key="hover-home"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Home className="h-7 w-7 text-accent" />
                        </motion.div>
                      ) : showLogoHint ? (
                        // Animation sequence during page load - douce et subtile
                        animationStep === "logo" ? (
                          <motion.div
                            key="logo-anim"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.6, ease: "easeInOut" }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <AppBranding logoSize={36} className="shrink-0" variant="icon" noLink />
                          </motion.div>
                        ) : animationStep === "home" ? (
                          <motion.div
                            key="home-anim"
                            initial={{ opacity: 0, scale: 0.9, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 4 }}
                            transition={{ duration: 0.6, ease: "easeInOut" }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <Home className="h-8 w-8 text-accent" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="arrow-anim"
                            initial={{ opacity: 0, scale: 0.9, x: -4 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9, x: 4 }}
                            transition={{ duration: 0.6, ease: "easeInOut" }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <ArrowLeft className="h-8 w-8 text-accent" />
                          </motion.div>
                        )
                      ) : (
                        // Default: show logo
                        <motion.div
                          key="logo-default"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <AppBranding logoSize={36} className="shrink-0" variant="icon" noLink />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Link>
                <h1 className="truncate bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-xl font-black tracking-tight text-transparent drop-shadow-sm">
                  {plan.event?.name || "Événement"}
                </h1>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {readOnly && (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-sm sm:h-8 sm:w-8">
                    <ShieldAlert size={16} className="sm:h-[14px] sm:w-[14px]" />
                  </span>
                )}
                {!readOnly && (
                  <Button
                    variant="premium"
                    onClick={handleShare}
                    className={cn(
                      "h-11 w-11 rounded-full border border-white/50 p-0 shadow-lg shadow-accent/5 backdrop-blur-sm transition-all hover:scale-110 hover:shadow-accent/20 active:scale-95 sm:h-8 sm:w-8",
                      showAttention && "btn-shine-attention"
                    )}
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
                    iconClassName="h-full w-full group-hover:bg-accent"
                    title={t("shareTitle")}
                  />
                )}
                <UserNav showLabel={true} />
              </div>
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
