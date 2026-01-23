"use client";

import { Calendar, Share, ExternalLink, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadIcsFile,
} from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { Meal } from "@/lib/types";

interface EventHeaderActionsProps {
  meal: Meal;
  eventName: string;
  isScrolled: boolean;
  readOnly: boolean;
  showAttention: boolean;
  onShareClick: () => void;
}

/**
 * EventHeaderActions
 * ------------------
 * Action buttons for calendar export and sharing.
 *
 * Features:
 * - Calendar popover with Google, Outlook, and ICS download options
 * - Share button with attention animation
 *
 * Styling:
 * - Compact pill container
 * - Icons change color based on scroll state
 */
export function EventHeaderActions({
  meal,
  eventName,
  isScrolled,
  readOnly,
  showAttention,
  onShareClick,
}: EventHeaderActionsProps) {
  const tPlanning = useTranslations("EventDashboard.Planning");

  const calendarTitle = meal.title ? `${eventName} - ${meal.title}` : eventName;
  const calendarDescription = tPlanning("calendar.description", { title: calendarTitle });

  // Individual button classes - spatial glass orbs
  const buttonClasses = cn(
    "glass-panel flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 hover:scale-105",
    "text-[#1a0a33]/80 hover:text-[#1a0a33]"
  );

  const isCalendarEnabled = meal.date !== "common";

  return (
    <div className="flex items-center gap-2">
      {/* Calendar Export */}
      {isCalendarEnabled && (
        <Popover>
          <PopoverTrigger asChild>
            <button className={buttonClasses} aria-label="Add to calendar">
              <Calendar size={16} strokeWidth={2} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="glass w-56 p-2" align="end">
            <div className="flex flex-col gap-1">
              <button
                onClick={() =>
                  window.open(
                    generateGoogleCalendarUrl(meal, eventName, calendarDescription),
                    "_blank"
                  )
                }
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all hover:bg-accent hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {tPlanning("calendar.google")}
              </button>
              <button
                onClick={() =>
                  window.open(
                    generateOutlookCalendarUrl(meal, eventName, calendarDescription),
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
                onClick={() => downloadIcsFile(meal, eventName, calendarDescription)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all hover:bg-accent hover:text-white"
              >
                <Download className="h-3.5 w-3.5" />
                {tPlanning("calendar.download")}
              </button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Share Button */}
      {!readOnly && (
        <button
          onClick={onShareClick}
          className={cn(buttonClasses, showAttention && "btn-shine-attention")}
          aria-label="Share event"
        >
          <Share size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
