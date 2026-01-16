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
  ExternalLink,
  Download,
} from "lucide-react";
import { type PlanData, type PlanningFilter, type Sheet } from "@/lib/types";
import { UserNav } from "@/components/auth/user-nav";
import {
  cn,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadIcsFile,
} from "@/lib/utils";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations, useFormatter } from "next-intl";
import { useThemeMode } from "../theme-provider";
import { AppBranding } from "@/components/common/app-branding";
import { CitationDisplay } from "../common/citation-display";
import { Link } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, ArrowLeft, Pencil } from "lucide-react";
import { AutoSizeText } from "@/components/common/auto-size-text";
import { AutoSizeInput } from "@/components/common/auto-size-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { TimePicker } from "@/components/ui/time-picker";

interface EventPlannerHeaderProps {
  readOnly: boolean;
  tab: string;
  setTab: (tab: any) => void;
  plan: PlanData;
  planningFilter: PlanningFilter;
  setPlanningFilter: (filter: PlanningFilter) => void;
  setSheet: (sheet: Sheet) => void;
  sheet: Sheet | null;
  unassignedItemsCount: number;
  slug: string;
  writeKey?: string;
  handlers: any;
}

export function EventPlannerHeader({
  readOnly,
  tab: _tab,
  setTab,
  plan,
  planningFilter: _planningFilter,
  setPlanningFilter: _setPlanningFilter,
  setSheet,
  sheet: _sheet,
  unassignedItemsCount: _unassignedItemsCount,
  slug,
  writeKey,
  handlers,
}: EventPlannerHeaderProps) {
  const { theme } = useThemeMode();
  const t = useTranslations("EventDashboard.Header");
  const tShared = useTranslations("EventDashboard.Shared");
  const tPlanning = useTranslations("EventDashboard.Planning");
  const format = useFormatter();
  const [copied, setCopied] = useState(false);
  const [showAttention, setShowAttention] = useState(true);
  const [showLogoHint, setShowLogoHint] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [animationStep, setAnimationStep] = useState<"logo" | "home" | "arrow">("logo");
  const [animationComplete, setAnimationComplete] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // States for inline editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(plan.event?.name || "");

  useEffect(() => {
    setEditedTitle(plan.event?.name || "");
  }, [plan.event?.name]);

  // Stop the attention-grabbing effect after 2 minutes
  useEffect(() => {
    const timer = setTimeout(() => setShowAttention(false), 2 * 60 * 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle scroll for sticky logo
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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

  const handleTitleSubmit = () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== plan.event?.name) {
      // Optimistic update: immediately update local plan state
      handlers.handleUpdateEvent?.(trimmedTitle);
    }
    setIsEditingTitle(false);
  };

  const firstMeal = plan.meals[0];
  const eventName = plan.event?.name || "Event";
  const calendarTitle = firstMeal?.title ? `${eventName} - ${firstMeal.title}` : eventName;
  const calendarDescription = tPlanning("calendar.description", { title: calendarTitle });

  const calendarUrl = firstMeal
    ? generateGoogleCalendarUrl(firstMeal, eventName, calendarDescription)
    : "";

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

      {/* Row 1: Navigation & Actions (moves with scroll) */}
      <div
        style={{
          background: `hsl(270 25% 92%)`,
        }}
        className="relative z-30 mx-auto w-full max-w-3xl px-4 pt-5 sm:pt-4"
      >
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
              href="/event"
              logoSize={24}
              textSize="sm"
              className="opacity-80 mix-blend-multiply"
            />
          </div>

          <div className="flex shrink-0 items-center gap-3 pr-3">
            <UserNav showLabel={true} />
          </div>
        </div>
      </div>

      {/* Row 2: Event Title & Pills (Sticky) */}
      <div
        style={{
          background: `linear-gradient(to bottom, hsl(270 25% 92%) 0%, hsl(270 25% 92%) 70%, transparent 100%)`,
        }}
        className="sticky top-0 z-30 w-full px-2 pb-8 pt-2 backdrop-blur-sm transition-all sm:pb-6"
      >
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col gap-0">
            {/* Event Title Row */}
            <div className="flex items-center gap-2 px-1">
              <AnimatePresence>
                {isScrolled && (
                  <motion.div
                    initial={{ opacity: 0, x: -10, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.8 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="shrink-0"
                  >
                    <AppBranding
                      variant="icon"
                      logoSize={28}
                      className="opacity-90"
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {!readOnly ? (
                isEditingTitle ? (
                  <div className="flex flex-1 items-center">
                    <AutoSizeInput
                      autoFocus
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onBlur={handleTitleSubmit}
                      onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
                      maxSize={48}
                      minSize={14}
                      className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text font-black tracking-tighter text-transparent drop-shadow-sm focus-visible:ring-0"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="flex flex-1 items-center text-left transition-opacity hover:opacity-80"
                  >
                    <AutoSizeText
                      maxSize={48}
                      minSize={14}
                      scaleThreshold={12}
                      className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text font-black tracking-tighter text-transparent drop-shadow-sm"
                    >
                      {plan.event?.name || tShared("defaultEventName")}
                    </AutoSizeText>
                  </button>
                )
              ) : (
                <div className="flex-1">
                  <AutoSizeText
                    maxSize={48}
                    minSize={20}
                    className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text font-black tracking-tighter text-transparent drop-shadow-sm"
                  >
                    {plan.event?.name || tShared("defaultEventName")}
                  </AutoSizeText>
                </div>
              )}
            </div>

            {/* Logistic Pills & Share (Glassmorphic) */}
            {plan.meals.length > 0 && (
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto pb-1 pt-0.5 text-sm font-medium">
                  {/* Date Pill */}
                  {!readOnly ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="group flex shrink-0 items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1.5 text-gray-700 shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:border-accent/30 hover:bg-white/60">
                          <Calendar size={14} className="text-accent" />
                          <span>
                            {format.dateTime(new Date(firstMeal.date), {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI
                          mode="single"
                          selected={new Date(firstMeal.date)}
                          onSelect={(date) => {
                            if (date) {
                              handlers.handleUpdateMeal?.(
                                firstMeal.id,
                                date.toISOString().split("T")[0],
                                firstMeal.title,
                                firstMeal.adults,
                                firstMeal.children,
                                firstMeal.time,
                                firstMeal.address
                              );
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1.5 text-gray-700 shadow-sm backdrop-blur-md">
                      <Calendar size={14} className="text-accent" />
                      <span>
                        {format.dateTime(new Date(firstMeal.date), {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  )}

                  {/* Time Pill (if distinct) */}
                  {!readOnly ? (
                    <TimePicker
                      value={firstMeal.time || ""}
                      onChange={(time) => {
                        handlers.handleUpdateMeal?.(
                          firstMeal.id,
                          firstMeal.date,
                          firstMeal.title,
                          firstMeal.adults,
                          firstMeal.children,
                          time,
                          firstMeal.address
                        );
                      }}
                    >
                      <button className="group flex shrink-0 items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1.5 text-gray-700 shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:border-accent/30 hover:bg-white/60">
                        <Clock size={14} className="text-accent" />
                        <span>{firstMeal.time || "--:--"}</span>
                      </button>
                    </TimePicker>
                  ) : (
                    firstMeal.time && (
                      <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1.5 text-gray-700 shadow-sm backdrop-blur-md">
                        <Clock size={14} className="text-accent" />
                        <span>{firstMeal.time}</span>
                      </div>
                    )
                  )}

                  {/* Address Pill */}
                  {firstMeal.address &&
                    (!readOnly ? (
                      <button
                        onClick={() => setSheet({ type: "event-edit" })}
                        className="group flex max-w-[150px] shrink-0 items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1.5 text-gray-700 shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:border-accent/30 hover:bg-white/60 sm:max-w-[200px]"
                      >
                        <MapPin size={14} className="shrink-0 text-accent" />
                        <span className="truncate">{firstMeal.address}</span>
                      </button>
                    ) : (
                      <div className="flex max-w-[150px] shrink-0 items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1.5 text-gray-700 shadow-sm backdrop-blur-md sm:max-w-[200px]">
                        <MapPin size={14} className="shrink-0 text-accent" />
                        <span className="truncate">{firstMeal.address}</span>
                      </div>
                    ))}

                  {/* Vacation Count (if multiple meals) */}
                  {plan.meals.length > 1 && (
                    <div className="flex shrink-0 items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 font-bold text-accent shadow-sm backdrop-blur-md">
                      <span className="text-xs">{plan.meals.length} jours</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons (End - All the way to the right) */}
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {/* Add to Calendar Button */}
                  {firstMeal && firstMeal.date !== "common" && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/40 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:border-accent/30 hover:bg-white/60 active:scale-95"
                          title={tPlanning("calendar.addToCalendar")}
                        >
                          <Calendar size={18} className="text-accent" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="glass w-56 p-2" align="end">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => window.open(calendarUrl, "_blank")}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all hover:bg-accent hover:text-white"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {tPlanning("calendar.google")}
                          </button>
                          <button
                            onClick={() =>
                              window.open(
                                generateOutlookCalendarUrl(
                                  firstMeal,
                                  eventName,
                                  calendarDescription
                                ),
                                "_blank"
                              )
                            }
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all hover:bg-accent hover:text-white"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {tPlanning("calendar.outlook")}
                          </button>
                          <div className="my-1 border-t border-black/[0.05]" />
                          <button
                            onClick={() =>
                              downloadIcsFile(firstMeal, eventName, calendarDescription)
                            }
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all hover:bg-accent hover:text-white"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {tPlanning("calendar.download")}
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}

                  {!readOnly && (
                    <button
                      onClick={handleShare}
                      className={cn(
                        "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/40 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:border-accent/30 hover:bg-white/60 active:scale-95",
                        showAttention && "btn-shine-attention"
                      )}
                      title={t("shareTitle")}
                    >
                      {copied ? (
                        <CheckCircle size={18} className="text-green-500" />
                      ) : (
                        <Share size={18} className="text-accent" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
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
