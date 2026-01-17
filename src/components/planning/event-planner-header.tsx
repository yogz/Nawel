"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  Share,
  CheckCircle,
  MapPin,
  ExternalLink,
  Download,
  Calendar,
  Clock,
} from "lucide-react";
import { Input } from "../ui/input";
import { type Meal, type PlanData, type PlanningFilter, type Item, type Sheet } from "@/lib/types";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";

interface EventPlannerHeaderProps {
  readOnly: boolean;
  tab: string;
  setTab: (tab: any) => void;
  plan: PlanData;
  setSheet: (sheet: Sheet) => void;
  sheet: Sheet | null;
  slug: string;
  writeKey?: string;
  handlers: any;
}

export function EventPlannerHeader({
  readOnly,
  tab: _tab,
  setTab,
  plan,
  setSheet,
  sheet: _sheet,
  slug,
  writeKey,
  handlers,
}: EventPlannerHeaderProps) {
  const isMobile = useIsMobile();
  const { theme } = useThemeMode();
  const t = useTranslations("EventDashboard.Header");
  const tShared = useTranslations("EventDashboard.Shared");
  const tPlanning = useTranslations("EventDashboard.Planning");
  const format = useFormatter();
  const [copied, setCopied] = useState(false);
  const [showAttention, setShowAttention] = useState(true);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);
  const [isAddressDrawerOpen, setIsAddressDrawerOpen] = useState(false);
  const [isAddressPopoverOpen, setIsAddressPopoverOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftFade(scrollLeft > 0);
      setShowRightFade(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      checkScroll();
      container.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        container.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, []);

  const [isScrolled, setIsScrolled] = useState(false);
  const [hovered, setHovered] = useState(false);

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
      handlers.handleUpdateEvent?.(trimmedTitle);
    }
    setIsEditingTitle(false);
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

      {/* Unified Rounded Header Container with Gradient */}
      <div
        className={cn(
          "sticky top-0 z-30 w-full",
          "rounded-b-[40px] shadow-lg overflow-hidden",
          "bg-gradient-to-br from-[#6366f1] via-[#a855f7] to-[#ec4899]" // Vibrant Indigo -> Purple -> Pink
        )}
        style={{
          paddingTop: `env(safe-area-inset-top, 0px)`,
        }}
      >
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial={false}
            animate={{
              paddingTop: isScrolled ? "1.25rem" : "1.25rem",
              paddingBottom: isScrolled ? "1.5rem" : "2rem",
            }}
            transition={{
              duration: 0.4,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="relative px-4"
          >
            <div className="flex flex-col gap-1">
              <motion.div
                initial={false}
                animate={{
                  height: isScrolled ? 0 : "auto",
                  opacity: isScrolled ? 0 : 1,
                  y: isScrolled ? -20 : 0,
                  marginBottom: isScrolled ? 0 : 12,
                }}
                transition={{
                  duration: 0.4,
                  ease: [0.32, 0.72, 0, 1],
                }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between gap-4 py-1">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Link
                      href="/event"
                      className="relative block shrink-0 rounded-full bg-white/30 p-2 shadow-sm backdrop-blur-md transition-all hover:scale-105 active:scale-95 border border-white/20"
                    >
                      <ArrowLeft className="h-5 w-5 text-white" />
                    </Link>
                    <AppBranding
                      href="/event"
                      logoSize={24}
                      textSize="sm"
                      className="opacity-95 text-white filter brightness-0 invert"
                    />
                  </div>
                  <UserNav showLabel={true} />
                </div>
              </motion.div>

              <div className="flex items-center gap-2">
                {!readOnly ? (
                  isEditingTitle ? (
                    <AutoSizeInput
                      autoFocus
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onBlur={handleTitleSubmit}
                      onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
                      maxSize={isScrolled ? 34 : 48}
                      minSize={14}
                      className="bg-transparent font-black tracking-tighter text-white border-none focus-visible:ring-0 caret-white"
                    />
                  ) : (
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="group flex flex-1 items-center gap-2 text-left"
                    >
                      <AutoSizeText
                        maxSize={isScrolled ? 34 : 48}
                        minSize={14}
                        className="font-black tracking-tighter text-white drop-shadow-md"
                      >
                        {plan.event?.name || tShared("defaultEventName")}
                      </AutoSizeText>
                      <Pencil
                        size={18}
                        className="opacity-0 transition-opacity group-hover:opacity-100 text-white/50"
                      />
                    </button>
                  )
                ) : (
                  <AutoSizeText
                    maxSize={isScrolled ? 34 : 48}
                    minSize={20}
                    className="font-black tracking-tighter text-white drop-shadow-md"
                  >
                    {plan.event?.name || tShared("defaultEventName")}
                  </AutoSizeText>
                )}
              </div>

              {plan.meals.length > 0 &&
                (() => {
                  const firstMeal = plan.meals[0];
                  const shortDate = format.dateTime(new Date(firstMeal.date), {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  });
                  const eventName = plan.event?.name || "Event";
                  const calendarTitle = firstMeal.title
                    ? `${eventName} - ${firstMeal.title}`
                    : eventName;
                  const calendarDescription = tPlanning("calendar.description", {
                    title: calendarTitle,
                  });
                  const calendarUrl = generateGoogleCalendarUrl(
                    firstMeal,
                    eventName,
                    calendarDescription
                  );

                  return (
                    <div className="flex items-center justify-between gap-2 px-1">
                      <div className="relative flex flex-1 min-w-0 overflow-hidden">
                        <div
                          className={cn(
                            "pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-4 bg-gradient-to-r from-[#8b5cf6] to-transparent transition-opacity duration-300",
                            showLeftFade ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div
                          ref={scrollContainerRef}
                          className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto pb-1 pt-0.5 text-sm font-medium"
                        >
                          {!readOnly ? (
                            <DatePicker
                              value={firstMeal.date ? new Date(firstMeal.date) : undefined}
                              onChange={(newDate) => {
                                if (newDate) {
                                  const dateStr = newDate.toISOString().split("T")[0];
                                  handlers.handleUpdateMeal?.(
                                    firstMeal.id,
                                    dateStr,
                                    firstMeal.title,
                                    firstMeal.adults,
                                    firstMeal.children,
                                    firstMeal.time,
                                    firstMeal.address
                                  );
                                }
                              }}
                            >
                              <button className="group flex shrink-0 items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3.5 py-1.5 mx-0.5 text-white shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:border-white/40 hover:bg-white/30 active:scale-95">
                                <Calendar
                                  size={14}
                                  className="shrink-0 text-white/90"
                                  strokeWidth={1.8}
                                />
                                <span className="truncate">{shortDate}</span>
                              </button>
                            </DatePicker>
                          ) : (
                            <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3.5 py-1.5 mx-0.5 text-white shadow-sm backdrop-blur-md">
                              <Calendar
                                size={14}
                                className="shrink-0 text-white/90"
                                strokeWidth={1.8}
                              />
                              <span className="truncate">{shortDate}</span>
                            </div>
                          )}

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
                              <button className="group flex shrink-0 items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3.5 py-1.5 mx-0.5 text-white shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:border-white/40 hover:bg-white/30 active:scale-95">
                                <Clock
                                  size={14}
                                  className="shrink-0 text-white/90"
                                  strokeWidth={1.8}
                                />
                                <span className="truncate">{firstMeal.time || "--:--"}</span>
                              </button>
                            </TimePicker>
                          ) : (
                            firstMeal.time && (
                              <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3.5 py-1.5 mx-0.5 text-white shadow-sm backdrop-blur-md">
                                <Clock
                                  size={14}
                                  className="shrink-0 text-white/90"
                                  strokeWidth={1.8}
                                />
                                <span className="truncate">{firstMeal.time}</span>
                              </div>
                            )
                          )}

                          {firstMeal.address &&
                            (!readOnly ? (
                              <div className="flex items-center">
                                {isMobile ? (
                                  <Drawer
                                    open={isAddressDrawerOpen}
                                    onOpenChange={setIsAddressDrawerOpen}
                                  >
                                    <DrawerTrigger asChild>
                                      <button className="group flex max-w-[180px] shrink-0 items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3.5 py-1.5 mx-0.5 text-white shadow-sm backdrop-blur-md transition-all active:scale-95 sm:max-w-[240px]">
                                        <MapPin
                                          size={14}
                                          className="shrink-0 text-white/90"
                                          strokeWidth={1.8}
                                        />
                                        <span className="truncate">{firstMeal.address}</span>
                                      </button>
                                    </DrawerTrigger>
                                    <DrawerContent className="px-4 pb-8">
                                      <DrawerHeader className="px-0 text-left">
                                        <DrawerTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">
                                          Modifier l'adresse
                                        </DrawerTitle>
                                      </DrawerHeader>
                                      <div className="flex flex-col gap-3 py-4">
                                        <Input
                                          defaultValue={firstMeal.address}
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              handlers.handleUpdateMeal?.(
                                                firstMeal.id,
                                                firstMeal.date,
                                                firstMeal.title,
                                                firstMeal.adults,
                                                firstMeal.children,
                                                firstMeal.time,
                                                (e.target as HTMLInputElement).value
                                              );
                                              setIsAddressDrawerOpen(false);
                                            }
                                          }}
                                          className="h-12 text-base"
                                        />
                                        <Button
                                          onClick={(e) => {
                                            const input = e.currentTarget
                                              .previousElementSibling as HTMLInputElement;
                                            handlers.handleUpdateMeal?.(
                                              firstMeal.id,
                                              firstMeal.date,
                                              firstMeal.title,
                                              firstMeal.adults,
                                              firstMeal.children,
                                              firstMeal.time,
                                              input.value
                                            );
                                            setIsAddressDrawerOpen(false);
                                          }}
                                          className="w-full bg-accent text-white"
                                        >
                                          Sauvegarder
                                        </Button>
                                      </div>
                                    </DrawerContent>
                                  </Drawer>
                                ) : (
                                  <Popover
                                    open={isAddressPopoverOpen}
                                    onOpenChange={setIsAddressPopoverOpen}
                                  >
                                    <PopoverTrigger asChild>
                                      <button className="group flex max-w-[180px] shrink-0 items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3.5 py-1.5 mx-0.5 text-white shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:border-white/40 hover:bg-white/30 sm:max-w-[240px]">
                                        <MapPin
                                          size={14}
                                          className="shrink-0 text-white/90"
                                          strokeWidth={1.8}
                                        />
                                        <span className="truncate">{firstMeal.address}</span>
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-3" align="start">
                                      <div className="flex flex-col gap-2">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                          Modifier l'adresse
                                        </h4>
                                        <Input
                                          defaultValue={firstMeal.address}
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              handlers.handleUpdateMeal?.(
                                                firstMeal.id,
                                                firstMeal.date,
                                                firstMeal.title,
                                                firstMeal.adults,
                                                firstMeal.children,
                                                firstMeal.time,
                                                (e.target as HTMLInputElement).value
                                              );
                                              setIsAddressPopoverOpen(false);
                                            }
                                          }}
                                          className="h-9"
                                        />
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            ) : (
                              <div className="flex max-w-[180px] shrink-0 items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3.5 py-1.5 mx-0.5 text-white shadow-sm backdrop-blur-md sm:max-w-[240px]">
                                <MapPin
                                  size={14}
                                  className="shrink-0 text-white/90"
                                  strokeWidth={1.8}
                                />
                                <span className="truncate">{firstMeal.address}</span>
                              </div>
                            ))}

                          {plan.meals.length > 1 && (
                            <div className="flex shrink-0 items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 font-bold text-accent shadow-sm backdrop-blur-md">
                              <span className="text-xs">{plan.meals.length} jours</span>
                            </div>
                          )}
                        </div>
                        <div
                          className={cn(
                            "pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-4 bg-gradient-to-l from-[#a855f7] to-transparent transition-opacity duration-300",
                            showRightFade ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </div>

                      <div className="ml-auto flex shrink-0 items-center gap-2">
                        {firstMeal && firstMeal.date !== "common" && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/20 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:border-white/40 hover:bg-white/30 active:scale-95">
                                <Calendar size={18} className="text-white/90" />
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
                              "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/20 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:border-white/40 hover:bg-white/30 active:scale-95",
                              showAttention && "btn-shine-attention"
                            )}
                          >
                            {copied ? (
                              <CheckCircle size={18} className="text-green-300" />
                            ) : (
                              <Share size={18} className="text-white/90" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
