"use client";

import { useEffect, useRef } from "react";

type Props = {
  selected: string | null;
  onSelect: (time: string) => void;
  startHour?: number;
  endHour?: number;
  stepMinutes?: number;
};

/**
 * Vertical scroll-snap "drum" picker for time. The user flicks the list;
 * whichever row sits behind the center highlight bar is the selection.
 * Scroll end is debounced to a single `onSelect` call — matches iOS
 * wheel pickers closely enough without pulling in a native-mobile lib.
 *
 * Defaults cover typical cultural-outing start times (17:00–23:30).
 */
export function TimeDrum({
  selected,
  onSelect,
  startHour = 17,
  endHour = 23,
  stepMinutes = 15,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const times: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }

  // Scroll the selected (or 20:00 default) time into view on mount.
  useEffect(() => {
    if (!scrollerRef.current) {
      return;
    }
    const target = selected ?? "20:00";
    const node = scrollerRef.current.querySelector<HTMLElement>(`[data-t="${target}"]`);
    if (node) {
      requestAnimationFrame(() => {
        node.scrollIntoView({ block: "center", behavior: "auto" });
      });
    }
  }, [selected]);

  // When the user stops scrolling, snap-pick the row closest to center.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    let debounce: ReturnType<typeof setTimeout> | null = null;

    function handle() {
      if (!el) {
        return;
      }
      if (debounce) {
        clearTimeout(debounce);
      }
      debounce = setTimeout(() => {
        if (!el) {
          return;
        }
        const center = el.scrollTop + el.clientHeight / 2;
        const rows = el.querySelectorAll<HTMLElement>("[data-t]");
        let bestTime: string | null = null;
        let bestDist = Infinity;
        rows.forEach((row) => {
          const mid = row.offsetTop + row.offsetHeight / 2;
          const d = Math.abs(mid - center);
          if (d < bestDist) {
            bestDist = d;
            bestTime = row.dataset.t ?? null;
          }
        });
        if (bestTime && bestTime !== selected) {
          onSelect(bestTime);
        }
      }, 120);
    }

    el.addEventListener("scroll", handle, { passive: true });
    return () => {
      el.removeEventListener("scroll", handle);
      if (debounce) {
        clearTimeout(debounce);
      }
    };
  }, [selected, onSelect]);

  return (
    <div className="relative h-[180px] overflow-hidden">
      {/* Highlight band in the center — masks the picker reveal point */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 h-[44px] rounded-xl bg-bordeaux-50 border-2 border-bordeaux-600"
      />
      {/* Fade masks top + bottom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[60px] bg-gradient-to-b from-ivoire-200 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[60px] bg-gradient-to-t from-ivoire-200 to-transparent"
      />
      <div
        ref={scrollerRef}
        className="h-full overflow-y-auto [scroll-snap-type:y_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingTop: 68, paddingBottom: 68 }}
      >
        {times.map((t) => (
          <button
            key={t}
            type="button"
            data-t={t}
            onClick={() => {
              scrollerRef.current
                ?.querySelector<HTMLElement>(`[data-t="${t}"]`)
                ?.scrollIntoView({ block: "center", behavior: "smooth" });
              onSelect(t);
            }}
            className={`flex h-11 w-full items-center justify-center text-2xl font-black tabular-nums tracking-tight [scroll-snap-align:center] ${
              selected === t ? "text-bordeaux-700" : "text-encre-300"
            }`}
          >
            {t.replace(":", "h")}
          </button>
        ))}
      </div>
    </div>
  );
}
