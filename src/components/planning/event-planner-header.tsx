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
import { ProfileDrawer } from "@/components/auth/profile-drawer";
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
import { Home, ChevronLeft, Pencil, MoreHorizontal } from "lucide-react";
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
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftFade(scrollLeft > 2);
      setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
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
      <div className="sticky top-0 z-30 w-full transition-all duration-300">
        <div
          className={cn(
            "mx-auto w-full lg:max-w-4xl transition-all duration-500",
            isScrolled
              ? "bg-white/80 backdrop-blur-xl border-b border-black/[0.03] shadow-sm rounded-none"
              : "bg-transparent rounded-none"
          )}
          style={{
            paddingTop: `env(safe-area-inset-top, 0px)`,
          }}
        >
          <div className="mx-auto max-w-3xl">
            <motion.div
              initial={false}
              animate={{
                paddingTop: isScrolled ? "1.1rem" : "1.25rem",
                paddingBottom: isScrolled ? "0.85rem" : "1.1rem",
              }}
              transition={{
                duration: 0.4,
                ease: [0.32, 0.72, 0, 1],
              }}
              className="relative px-4"
            >
              <div className="flex flex-col gap-0.5">
                <motion.div
                  initial={false}
                  animate={{
                    height: isScrolled ? 0 : "auto",
                    opacity: isScrolled ? 0 : 1,
                    y: isScrolled ? -20 : 0,
                    marginBottom: isScrolled ? 0 : 4,
                  }}
                  transition={{
                    duration: 0.4,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-4 py-1">
                    {/* Back button - more transparent */}
                    <Link
                      href="/event"
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 border",
                        isScrolled
                          ? "bg-black/[0.03] border-black/[0.05] text-gray-900"
                          : "bg-white/15 border-white/15 text-white backdrop-blur-md"
                      )}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Link>

                    {/* Centered CoList branding */}
                    <div className="absolute left-1/2 -translate-x-1/2">
                      <AppBranding
                        href="/event"
                        logoSize={24}
                        className={cn(
                          "opacity-95 transition-all outline-none",
                          isScrolled ? "text-gray-900" : "text-white filter brightness-0 invert"
                        )}
                      />
                    </div>

                    {/* Menu pill with "..." - opens profile */}
                    <button
                      onClick={() => setShowProfileDrawer(true)}
                      className={cn(
                        "flex h-10 shrink-0 items-center gap-2 rounded-full px-4 transition-all hover:scale-105 active:scale-95 border",
                        isScrolled
                          ? "bg-black/[0.03] border-black/[0.05] text-gray-900"
                          : "bg-white/15 border-white/15 text-white backdrop-blur-md"
                      )}
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
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
                        className={cn(
                          "bg-transparent font-black tracking-tighter border-none focus-visible:ring-0 transition-colors",
                          isScrolled ? "text-gray-900 caret-gray-900" : "text-white caret-white"
                        )}
                      />
                    ) : (
                      <button
                        onClick={() => setIsEditingTitle(true)}
                        className="group flex flex-1 items-center gap-2 text-left"
                      >
                        <AutoSizeText
                          maxSize={isScrolled ? 34 : 48}
                          minSize={14}
                          className={cn(
                            "font-black tracking-tighter drop-shadow-sm transition-colors",
                            isScrolled ? "text-gray-900" : "text-white"
                          )}
                        >
                          {plan.event?.name || tShared("defaultEventName")}
                        </AutoSizeText>
                        <Pencil
                          size={18}
                          className={cn(
                            "opacity-0 transition-opacity group-hover:opacity-100",
                            isScrolled ? "text-gray-400" : "text-white/50"
                          )}
                        />
                      </button>
                    )
                  ) : (
                    <AutoSizeText
                      maxSize={isScrolled ? 34 : 48}
                      minSize={20}
                      className={cn(
                        "font-black tracking-tighter drop-shadow-sm transition-colors",
                        isScrolled ? "text-gray-900" : "text-white"
                      )}
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
                            ref={scrollContainerRef}
                            className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto pb-1 pt-0.5 text-sm font-medium transition-all"
                            style={{
                              WebkitMaskImage: `linear-gradient(to right, 
                                      ${showLeftFade ? "transparent 0%" : "black 0%"}, 
                                      black ${showLeftFade ? "64px" : "0%"}, 
                                      black calc(100% - ${showRightFade ? "64px" : "0%"}), 
                                      ${showRightFade ? "transparent 100%" : "black 100%"})`,
                              maskImage: `linear-gradient(to right, 
                                      ${showLeftFade ? "transparent 0%" : "black 0%"}, 
                                      black ${showLeftFade ? "64px" : "0%"}, 
                                      black calc(100% - ${showRightFade ? "64px" : "0%"}), 
                                      ${showRightFade ? "transparent 100%" : "black 100%"})`,
                            }}
                          >
                            {!readOnly ? (
                              <DatePicker
                                value={firstMeal.date ? new Date(firstMeal.date) : undefined}
                                onChange={(newDate) => {
                                  if (newDate) {
                                    // Use local date methods to avoid timezone issues with toISOString()
                                    const year = newDate.getFullYear();
                                    const month = String(newDate.getMonth() + 1).padStart(2, "0");
                                    const day = String(newDate.getDate()).padStart(2, "0");
                                    const dateStr = `${year}-${month}-${day}`;
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
                                <button
                                  className={cn(
                                    "group flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 mx-0.5 shadow-sm transition-all hover:scale-105 active:scale-95",
                                    isScrolled
                                      ? "bg-black/[0.03] border-black/[0.05] text-gray-700"
                                      : "bg-white/15 border-white/20 text-white backdrop-blur-md"
                                  )}
                                >
                                  <Calendar
                                    size={14}
                                    className={isScrolled ? "text-gray-400" : "text-white/90"}
                                    strokeWidth={1.8}
                                  />
                                  <span className="truncate">{shortDate}</span>
                                </button>
                              </DatePicker>
                            ) : (
                              <div
                                className={cn(
                                  "flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 mx-0.5 shadow-sm transition-all",
                                  isScrolled
                                    ? "bg-black/[0.03] border-black/[0.05] text-gray-700"
                                    : "bg-white/15 border-white/20 text-white backdrop-blur-md"
                                )}
                              >
                                <Calendar
                                  size={14}
                                  className={isScrolled ? "text-gray-400" : "text-white/90"}
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
                                <button
                                  className={cn(
                                    "group flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 mx-0.5 shadow-sm transition-all hover:scale-105 active:scale-95",
                                    isScrolled
                                      ? "bg-black/[0.03] border-black/[0.05] text-gray-700"
                                      : "bg-white/15 border-white/20 text-white backdrop-blur-md"
                                  )}
                                >
                                  <Clock
                                    size={14}
                                    className={isScrolled ? "text-gray-400" : "text-white/90"}
                                    strokeWidth={1.8}
                                  />
                                  <span className="truncate">{firstMeal.time || "--:--"}</span>
                                </button>
                              </TimePicker>
                            ) : (
                              firstMeal.time && (
                                <div
                                  className={cn(
                                    "flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 mx-0.5 shadow-sm transition-all",
                                    isScrolled
                                      ? "bg-black/[0.03] border-black/[0.05] text-gray-700"
                                      : "bg-white/15 border-white/20 text-white backdrop-blur-md"
                                  )}
                                >
                                  <Clock
                                    size={14}
                                    className={isScrolled ? "text-gray-400" : "text-white/90"}
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
                                        <button
                                          className={cn(
                                            "group flex h-10 max-w-[180px] shrink-0 items-center gap-2 rounded-full border px-4 mx-0.5 shadow-sm transition-all active:scale-95 sm:max-w-[240px]",
                                            isScrolled
                                              ? "bg-black/[0.03] border-black/[0.05] text-gray-700"
                                              : "bg-white/15 border-white/20 text-white backdrop-blur-md"
                                          )}
                                        >
                                          <MapPin
                                            size={14}
                                            className={
                                              isScrolled ? "text-gray-400" : "text-white/90"
                                            }
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
                                        <button
                                          className={cn(
                                            "group flex h-10 max-w-[180px] shrink-0 items-center gap-2 rounded-full border px-4 mx-0.5 shadow-sm transition-all hover:scale-105 active:scale-95 sm:max-w-[240px]",
                                            isScrolled
                                              ? "bg-black/[0.03] border-black/[0.05] text-gray-700"
                                              : "bg-white/15 border-white/20 text-white backdrop-blur-md"
                                          )}
                                        >
                                          <MapPin
                                            size={14}
                                            className={
                                              isScrolled ? "text-gray-400" : "text-white/90"
                                            }
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
                                <div
                                  className={cn(
                                    "flex h-10 max-w-[180px] shrink-0 items-center gap-2 rounded-full border px-4 mx-0.5 shadow-sm transition-all",
                                    isScrolled
                                      ? "bg-black/[0.03] border-black/[0.05] text-gray-700"
                                      : "bg-white/15 border-white/20 text-white backdrop-blur-md"
                                  )}
                                >
                                  <MapPin
                                    size={14}
                                    className={isScrolled ? "text-gray-400" : "text-white/90"}
                                    strokeWidth={1.8}
                                  />
                                  <span className="truncate">{firstMeal.address}</span>
                                </div>
                              ))}

                            {plan.meals.length > 1 && (
                              <div
                                className={cn(
                                  "flex h-10 shrink-0 items-center gap-2 rounded-full px-4 font-bold shadow-sm transition-all border",
                                  isScrolled
                                    ? "bg-black/[0.03] border-black/[0.05] text-gray-700"
                                    : "bg-white/15 border-white/20 text-white backdrop-blur-md"
                                )}
                              >
                                <span className="text-xs">{plan.meals.length} jours</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="ml-auto flex shrink-0 items-center gap-2">
                          {firstMeal && firstMeal.date !== "common" && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  className={cn(
                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition-all hover:scale-105 active:scale-95",
                                    isScrolled
                                      ? "bg-black/[0.03] border-black/[0.05] text-gray-700"
                                      : "bg-white/15 border-white/20 text-white backdrop-blur-md"
                                  )}
                                >
                                  <Calendar
                                    size={18}
                                    className={isScrolled ? "text-gray-500" : "text-white/90"}
                                  />
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
                              onClick={() => setSheet({ type: "share" })}
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition-all hover:scale-105 active:scale-95",
                                isScrolled
                                  ? "bg-black/[0.03] border-black/[0.05] text-gray-700"
                                  : "bg-white/15 border-white/20 text-white backdrop-blur-md",
                                showAttention && "btn-shine-attention"
                              )}
                            >
                              <Share
                                size={18}
                                className={isScrolled ? "text-gray-500" : "text-white/90"}
                              />
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
      </div>
      <ProfileDrawer open={showProfileDrawer} onClose={() => setShowProfileDrawer(false)} />
    </>
  );
}
