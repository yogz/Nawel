"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormatter } from "next-intl";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { Meal } from "@/lib/types";

interface EventMetaPillsProps {
  meal: Meal;
  mealCount: number;
  isScrolled: boolean;
  readOnly: boolean;
  onUpdateMeal: (
    mealId: number,
    date: string,
    title?: string | null,
    adults?: number,
    children?: number,
    time?: string,
    address?: string
  ) => void;
}

/**
 * EventMetaPills
 * --------------
 * Horizontally scrollable pills showing date, time, and location.
 *
 * Features:
 * - Horizontal scroll with fade edges
 * - Click to edit (when not readOnly)
 * - Date picker, time picker, address editor
 * - Mobile uses drawer, desktop uses popover for address
 *
 * Styling:
 * - White/transparent pills when not scrolled (over gradient)
 * - Gray/white pills when scrolled (over white header)
 */
export function EventMetaPills({
  meal,
  mealCount,
  isScrolled,
  readOnly,
  onUpdateMeal,
}: EventMetaPillsProps) {
  const format = useFormatter();
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);
  const [isAddressDrawerOpen, setIsAddressDrawerOpen] = useState(false);
  const [isAddressPopoverOpen, setIsAddressPopoverOpen] = useState(false);

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

  // Dark text for contrast, background adapts to scroll state
  const pillClasses = cn(
    "group flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 mx-0.5 shadow-sm transition-all text-gray-700",
    isScrolled ? "bg-white/50 border-white/60" : "bg-white/40 border-black/[0.06] backdrop-blur-sm"
  );

  const pillClassesInteractive = cn(pillClasses, "hover:scale-105 active:scale-95");

  // Dark icons for better contrast
  const iconClasses = "text-gray-500";

  const shortDate = format.dateTime(new Date(meal.date), {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, "0");
      const day = String(newDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      onUpdateMeal(
        meal.id,
        dateStr,
        meal.title,
        meal.adults,
        meal.children,
        meal.time ?? undefined,
        meal.address ?? undefined
      );
    }
  };

  const handleTimeChange = (time: string) => {
    onUpdateMeal(
      meal.id,
      meal.date,
      meal.title,
      meal.adults,
      meal.children,
      time,
      meal.address ?? undefined
    );
  };

  const handleAddressChange = (address: string) => {
    onUpdateMeal(
      meal.id,
      meal.date,
      meal.title,
      meal.adults,
      meal.children,
      meal.time ?? undefined,
      address
    );
  };

  return (
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
        {/* Date Pill */}
        {!readOnly ? (
          <DatePicker
            value={meal.date ? new Date(meal.date) : undefined}
            onChange={handleDateChange}
          >
            <button className={pillClassesInteractive}>
              <Calendar size={12} className={iconClasses} strokeWidth={2} />
              <span className="truncate text-sm font-semibold">{shortDate}</span>
            </button>
          </DatePicker>
        ) : (
          <div className={pillClasses}>
            <Calendar size={12} className={iconClasses} strokeWidth={2} />
            <span className="truncate text-sm font-semibold">{shortDate}</span>
          </div>
        )}

        {/* Time Pill */}
        {!readOnly ? (
          <TimePicker value={meal.time || ""} onChange={handleTimeChange}>
            <button className={pillClassesInteractive}>
              <Clock size={12} className={iconClasses} strokeWidth={2} />
              <span className="truncate text-sm font-semibold">{meal.time || "--:--"}</span>
            </button>
          </TimePicker>
        ) : (
          meal.time && (
            <div className={pillClasses}>
              <Clock size={12} className={iconClasses} strokeWidth={2} />
              <span className="truncate text-sm font-semibold">{meal.time}</span>
            </div>
          )
        )}

        {/* Address Pill */}
        {meal.address &&
          (!readOnly ? (
            isMobile ? (
              <Drawer open={isAddressDrawerOpen} onOpenChange={setIsAddressDrawerOpen}>
                <DrawerTrigger asChild>
                  <button className={cn(pillClassesInteractive, "max-w-[180px] sm:max-w-[240px]")}>
                    <MapPin size={12} className={iconClasses} strokeWidth={2} />
                    <span className="truncate text-sm font-semibold">{meal.address}</span>
                  </button>
                </DrawerTrigger>
                <DrawerContent className="px-4 pb-8">
                  <DrawerHeader className="px-0 text-left">
                    <DrawerTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Modifier l&apos;adresse
                    </DrawerTitle>
                  </DrawerHeader>
                  <div className="flex flex-col gap-3 py-4">
                    <Input
                      defaultValue={meal.address}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddressChange((e.target as HTMLInputElement).value);
                          setIsAddressDrawerOpen(false);
                        }
                      }}
                      className="h-12 text-base"
                    />
                    <Button
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        handleAddressChange(input.value);
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
              <Popover open={isAddressPopoverOpen} onOpenChange={setIsAddressPopoverOpen}>
                <PopoverTrigger asChild>
                  <button className={cn(pillClassesInteractive, "max-w-[180px] sm:max-w-[240px]")}>
                    <MapPin size={12} className={iconClasses} strokeWidth={2} />
                    <span className="truncate text-sm font-semibold">{meal.address}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="flex flex-col gap-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Modifier l&apos;adresse
                    </h4>
                    <Input
                      defaultValue={meal.address}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddressChange((e.target as HTMLInputElement).value);
                          setIsAddressPopoverOpen(false);
                        }
                      }}
                      className="h-9"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            )
          ) : (
            <div className={cn(pillClasses, "max-w-[180px]")}>
              <MapPin size={12} className={iconClasses} strokeWidth={2} />
              <span className="truncate text-sm font-semibold">{meal.address}</span>
            </div>
          ))}

        {/* Days Count Pill */}
        <div className={pillClasses}>
          <span className="text-[10px] uppercase font-bold tracking-wider">
            {mealCount} {mealCount === 1 ? "jour" : "jours"}
          </span>
        </div>
      </div>
    </div>
  );
}
