"use client";

import { useEffect, useMemo, useRef } from "react";

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
 * Horizontal day strip — 21 day cards (today + 20 ahead) with CSS
 * scroll-snap so the thumb finds each tile cleanly. Selecting only sets
 * the DATE part; time is picked separately in `TimeDrum`. Replaces the
 * calendar popover from `DateTimePicker` for the wizard path — it felt
 * like a form control, this feels like flipping through tickets.
 */
export function DayStrip({ selected, onSelect, daysAhead = 20 }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

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

  // On first render, scroll the selected day (or today) into view. Using
  // `behavior: "auto"` so there's no jitter on mount.
  useEffect(() => {
    if (!scrollerRef.current) {
      return;
    }
    const selectedIdx = selected ? days.findIndex((d) => sameDay(d, selected)) : 0;
    const target = scrollerRef.current.querySelector<HTMLElement>(
      `[data-idx="${Math.max(0, selectedIdx)}"]`
    );
    if (target) {
      target.scrollIntoView({ behavior: "auto", inline: "start", block: "nearest" });
    }
  }, [selected, days]);

  return (
    <div
      ref={scrollerRef}
      className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2 [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {days.map((d, idx) => {
        const isSelected = selected ? sameDay(d, selected) : false;
        const isToday = idx === 0;
        return (
          <button
            key={d.toISOString()}
            type="button"
            data-idx={idx}
            onClick={() => onSelect(d)}
            aria-pressed={isSelected}
            className={`relative flex h-28 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 transition-all [scroll-snap-align:start] ${
              isSelected
                ? "border-bordeaux-600 bg-bordeaux-600 text-ivoire-50"
                : "border-encre-100 bg-white text-encre-700 active:scale-95"
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
          </button>
        );
      })}
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
