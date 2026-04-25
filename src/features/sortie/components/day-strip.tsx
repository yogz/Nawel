"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fr } from "date-fns/locale";
import { CalendarPlus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  selected: Date | null;
  onSelect: (date: Date) => void;
  daysAhead?: number;
};

const WEEKDAY_SHORT = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MONTH_SHORT = [
  "janv.",
  "févr.",
  "mars",
  "avril",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/**
 * Horizontal day strip — shows `daysAhead` day cards (today + next 20 by
 * default) with CSS scroll-snap. The LEADING "Autre date" card opens a
 * full Shadcn Calendar popover for far-future dates (concerts booked
 * three months ahead, operas announced for next season).
 *
 * Scroll behaviour: auto-centers the initial selection on mount only —
 * re-running `scrollIntoView` on every `selected` change was fighting
 * the user's in-flight swipe and left the momentum-scroll in a bad
 * state on iOS.
 */
export function DayStrip({ selected, onSelect, daysAhead = 20 }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);
  const [farOpen, setFarOpen] = useState(false);

  const days = useMemo(() => {
    const out: Date[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = 0; i <= daysAhead; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      out.push(d);
    }
    return out;
  }, [daysAhead]);

  // A "far" selection = outside the visible strip. We render a dedicated
  // highlighted card at the end of the strip for it so the user keeps
  // visual feedback after picking from the calendar popover.
  const farSelected = useMemo(() => {
    if (!selected) {
      return null;
    }
    const withinStrip = days.some((d) => sameDay(d, selected));
    return withinStrip ? null : selected;
  }, [selected, days]);

  useEffect(() => {
    if (didInitialScroll.current || !scrollerRef.current) {
      return;
    }
    didInitialScroll.current = true;
    const selectedIdx = selected ? days.findIndex((d) => sameDay(d, selected)) : 0;
    if (selectedIdx < 0) {
      return;
    }
    const target = scrollerRef.current.querySelector<HTMLElement>(`[data-idx="${selectedIdx}"]`);
    // `inline: "center"` keeps the user's selection in the middle of the
    // viewport after a popover pick — "start" used to slam it to the left
    // edge, hiding the days they might want to glance back at.
    target?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
  }, [selected, days]);

  return (
    <div
      ref={scrollerRef}
      className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2 [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* Calendar trigger placed FIRST in the strip — cultural outings
          are disproportionately booked weeks/months ahead (opera next
          season, concert in 3 months). Burying the calendar behind 21
          day cards was optimising for the wrong 80%. Still keeps the
          popover behaviour; the card at the end has been removed. */}
      <Popover open={farOpen} onOpenChange={setFarOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-28 w-20 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-bordeaux-300 bg-transparent text-bordeaux-600 transition-colors motion-safe:active:scale-95 hover:border-bordeaux-600 hover:text-bordeaux-700 [scroll-snap-align:start]"
          >
            <CalendarPlus size={22} />
            <span className="text-[11px] font-semibold leading-tight text-center">Autre date</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="theme-sortie w-auto bg-ivoire-50 p-0">
          <Calendar
            mode="single"
            selected={selected ?? undefined}
            onSelect={(day) => {
              if (day) {
                onSelect(day);
                setFarOpen(false);
              }
            }}
            locale={fr}
            weekStartsOn={1}
            fromDate={new Date()}
            className="[--cell-size:2.25rem]"
          />
        </PopoverContent>
      </Popover>

      {days.map((d, idx) => {
        const isSelected = selected ? sameDay(d, selected) : false;
        const isToday = idx === 0;
        // Mark the first card of each new month so the user spots the
        // April→May transition without needing to read every label.
        const prev = days[idx - 1];
        const isMonthBreak = prev !== undefined && prev.getMonth() !== d.getMonth();
        return (
          <div key={d.toISOString()} className="relative flex shrink-0 items-stretch">
            {isMonthBreak && (
              <span aria-hidden="true" className="mx-1 self-center h-20 w-px bg-encre-200" />
            )}
            <button
              type="button"
              data-idx={idx}
              onClick={() => onSelect(d)}
              aria-pressed={isSelected}
              className={`relative flex h-28 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 transition-all [scroll-snap-align:center] ${
                isSelected
                  ? "border-bordeaux-600 bg-bordeaux-600 text-ivoire-50"
                  : "border-encre-100 bg-white text-encre-700 motion-safe:active:scale-95"
              }`}
            >
              <span
                className={`text-[10px] font-black uppercase tracking-[0.12em] ${
                  isSelected ? "text-ivoire-200" : "text-encre-400"
                }`}
              >
                {isToday ? "Aujourd'hui" : WEEKDAY_SHORT[d.getDay()]}
              </span>
              <span
                className={`text-3xl font-black leading-none tracking-tight ${
                  isSelected ? "text-ivoire-50" : "text-encre-700"
                }`}
              >
                {d.getDate()}
              </span>
              <span
                className={`text-[11px] font-semibold ${
                  isSelected ? "text-ivoire-200" : "text-encre-400"
                }`}
              >
                {MONTH_SHORT[d.getMonth()]}
              </span>
              {/* Coral anchor dot on today when not selected — the small
                  "Aujourd'hui" label gets lost on a crowded strip. */}
              {isToday && !isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-2 h-1.5 w-1.5 rounded-full bg-or-500"
                />
              )}
            </button>
          </div>
        );
      })}

      {/* "Far" card — rendered only when the user picked a date outside
          the strip. Lets them see their selection even after the strip
          scrolls away from it. */}
      {farSelected && (
        <button
          type="button"
          aria-pressed
          onClick={() => setFarOpen(true)}
          className="relative flex h-28 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-bordeaux-600 bg-bordeaux-600 text-ivoire-50 [scroll-snap-align:center]"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-ivoire-200">
            {WEEKDAY_SHORT[farSelected.getDay()]}
          </span>
          <span className="text-3xl font-black leading-none tracking-tight">
            {farSelected.getDate()}
          </span>
          <span className="text-[11px] font-semibold text-ivoire-200">
            {MONTH_SHORT[farSelected.getMonth()]}
          </span>
        </button>
      )}
    </div>
  );
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
