"use client";

import { useEffect, useMemo, useRef } from "react";

type Props = {
  selected: string | null;
  onSelect: (time: string) => void;
  startHour?: number;
  endHour?: number;
  stepMinutes?: number;
};

/**
 * Horizontal chip picker for a time of day. Replaced the iOS-wheel drum
 * because users couldn't tell which row was "in the band" — the chips
 * make the selected slot unambiguous (solid cobalt pill vs outlined
 * others) and big enough to hit with a thumb.
 *
 * Default range covers cultural-outing start times: 17:00 → 23:30 in
 * 15-minute steps.
 */
export function TimeDrum({
  selected,
  onSelect,
  startHour = 17,
  endHour = 23,
  stepMinutes = 15,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const times = useMemo(() => {
    const out: string[] = [];
    for (let h = startHour; h <= endHour; h++) {
      for (let m = 0; m < 60; m += stepMinutes) {
        out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return out;
  }, [startHour, endHour, stepMinutes]);

  // Center the selected chip on mount so the user sees it without
  // needing to scroll. `inline: "center"` on a horizontal scroller
  // handles this cleanly.
  useEffect(() => {
    if (!scrollerRef.current) {
      return;
    }
    const target = selected ?? "20:00";
    const node = scrollerRef.current.querySelector<HTMLElement>(`[data-t="${target}"]`);
    if (node) {
      requestAnimationFrame(() => {
        node.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
      });
    }
  }, [selected]);

  return (
    <div
      ref={scrollerRef}
      className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2 [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {times.map((t) => {
        const isSelected = selected === t;
        return (
          <button
            key={t}
            type="button"
            data-t={t}
            onClick={() => onSelect(t)}
            aria-pressed={isSelected}
            className={`flex h-16 w-20 shrink-0 items-center justify-center rounded-2xl border-2 text-xl font-black tabular-nums tracking-tight transition-colors [scroll-snap-align:center] ${
              isSelected
                ? "border-bordeaux-600 bg-bordeaux-600 text-ivoire-50"
                : "border-encre-100 bg-white text-encre-400 active:scale-95"
            }`}
          >
            {t.replace(":", "h")}
          </button>
        );
      })}
    </div>
  );
}
