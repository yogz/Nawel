"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  selected: Date | null;
  onSelect: (date: Date) => void;
  fromDate?: Date;
};

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"]; // Monday-first
const MONTH_LABELS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/**
 * Full-width month-grid calendar styled for Sortie. Monday-first week,
 * today marked with a coral dot beneath the number, selected day
 * rendered as a chunky cobalt square.
 *
 * Written in ~150 lines specifically to escape the Shadcn Calendar's
 * `w-fit` root and `bg-accent` today styling, both of which looked
 * terrible inline on the "C'est quand ?" step. No external deps beyond
 * Lucide icons.
 */
export function SortieCalendar({ selected, onSelect, fromDate }: Props) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const minDate = useMemo(() => {
    if (!fromDate) {
      return today;
    }
    const d = new Date(fromDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [fromDate, today]);

  // Month currently displayed — defaults to the selected date's month or
  // today's month. Navigation state only; doesn't affect selection.
  const [viewDate, setViewDate] = useState(() => {
    const base = selected ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const rows = useMemo(() => buildMonthGrid(viewDate), [viewDate]);

  function goPrev() {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() - 1);
    // Don't navigate into a month entirely before `minDate`.
    const lastOfPrev = new Date(next.getFullYear(), next.getMonth() + 1, 0);
    if (lastOfPrev.getTime() < minDate.getTime()) {
      return;
    }
    setViewDate(next);
  }
  function goNext() {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + 1);
    setViewDate(next);
  }

  const canGoPrev = (() => {
    const prevMonthLast = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0);
    return prevMonthLast.getTime() >= minDate.getTime();
  })();

  return (
    <div className="flex flex-col gap-3">
      {/* Month header */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canGoPrev}
          aria-label="Mois précédent"
          className="grid size-10 place-items-center rounded-full text-encre-500 transition-colors active:scale-95 hover:bg-bordeaux-50 hover:text-bordeaux-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-bordeaux-600">
            {viewDate.getFullYear()}
          </p>
          <h3 className="text-xl font-black leading-tight text-encre-700">
            {MONTH_LABELS[viewDate.getMonth()]}
          </h3>
        </div>
        <button
          type="button"
          onClick={goNext}
          aria-label="Mois suivant"
          className="grid size-10 place-items-center rounded-full text-encre-500 transition-colors active:scale-95 hover:bg-bordeaux-50 hover:text-bordeaux-700"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 text-center text-[11px] font-black uppercase tracking-wider text-encre-300">
        {WEEKDAY_LABELS.map((w, i) => (
          <span key={`${w}-${i}`}>{w}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {rows.map((cell) => {
          const isSelected = selected ? sameDay(cell.date, selected) : false;
          const isToday = sameDay(cell.date, today);
          const isPast = cell.date.getTime() < minDate.getTime();
          const isOutside = !cell.inMonth;
          return (
            <button
              key={cell.date.toISOString()}
              type="button"
              onClick={() => !isPast && onSelect(cell.date)}
              disabled={isPast}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              className={`relative flex aspect-square items-center justify-center rounded-xl text-base font-bold transition-colors ${
                isSelected
                  ? "bg-bordeaux-600 text-ivoire-50 shadow-[var(--shadow-sm)]"
                  : isPast
                    ? "cursor-not-allowed text-encre-200"
                    : isOutside
                      ? "text-encre-200 hover:bg-ivoire-100"
                      : isToday
                        ? "text-bordeaux-700 hover:bg-bordeaux-50"
                        : "text-encre-700 hover:bg-bordeaux-50 active:scale-95"
              }`}
            >
              {cell.date.getDate()}
              {isToday && !isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-or-500"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Cell = { date: Date; inMonth: boolean };

/**
 * Build a 6-week grid rooted at the Monday of the week containing the
 * first of the month. 42 cells — enough for any month layout.
 */
function buildMonthGrid(viewDate: Date): Cell[] {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  // JS Sunday=0 → convert to Monday=0 indexing so we can offset cleanly.
  const dow = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - dow);

  const out: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push({ date: d, inMonth: d.getMonth() === viewDate.getMonth() });
  }
  return out;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
