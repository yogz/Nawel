"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { type DayBucket, monthAtOffset } from "@/features/sortie/lib/agenda-grid";
import { parisDayKey } from "@/features/sortie/lib/date-fr";
import { cn } from "@/lib/utils";

type Props = {
  now: Date;
  buckets: Map<string, DayBucket>;
  offset: number;
  onOffsetChange: (offset: number) => void;
  onDaySelect: (dayKey: string) => void;
};

function isWeekend(weekday: number): boolean {
  return weekday === 0 || weekday === 6;
}

function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  // month est 1-12. Date(year, month, 0) = dernier jour du mois précédent
  // (donc dernier jour du mois `month` quand on passe `month` directement).
  return new Date(year, month, 0).getDate();
}

type DayMark = {
  dayKey: string;
  dayOfMonth: number;
  weekday: number;
  count: number;
  isToday: boolean;
};

/**
 * Sparkline horizontale du mois — 1 colonne par jour, bâton lime acid
 * au centre quand il y a des events (hauteur fonction du count). Les
 * WE (sam/dim) sont matérialisés par une bande de fond continue, même
 * sans event — on lit la rythmique semaine/WE d'un coup d'œil. Today =
 * trait crème en haut + fond légèrement teinté. Tap d'une colonne avec
 * event remonte la dayKey au parent.
 */
export function AgendaMonthHeatmap({ now, buckets, offset, onOffsetChange, onDaySelect }: Props) {
  const month = useMemo(() => monthAtOffset(now, offset), [now, offset]);
  const todayKey = useMemo(() => parisDayKey(now), [now]);
  const totalDays = useMemo(() => daysInMonth(month.monthKey), [month.monthKey]);

  const days = useMemo<DayMark[]>(() => {
    const out: DayMark[] = [];
    for (let d = 1; d <= totalDays; d++) {
      const dayKey = `${month.monthKey}-${String(d).padStart(2, "0")}`;
      const date = new Date(`${dayKey}T12:00:00+02:00`);
      const bucket = buckets.get(dayKey);
      out.push({
        dayKey,
        dayOfMonth: d,
        weekday: date.getDay(),
        count: bucket ? bucket.fixed.length + bucket.vote.length : 0,
        isToday: dayKey === todayKey,
      });
    }
    return out;
  }, [buckets, month.monthKey, todayKey, totalDays]);

  const eventDayCount = days.filter((d) => d.count > 0).length;

  return (
    <section>
      <header className="mb-2 flex items-center justify-between gap-2">
        <MiniChevron label="mois précédent" onClick={() => onOffsetChange(offset - 1)}>
          <ChevronLeft size={14} strokeWidth={2.4} />
        </MiniChevron>
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-[16px] font-black uppercase leading-none tracking-tight text-ink-700">
            {month.label}
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
            {eventDayCount > 0
              ? `${String(eventDayCount).padStart(2, "0")} jour${eventDayCount > 1 ? "s" : ""}`
              : "─"}
          </span>
        </div>
        <MiniChevron label="mois suivant" onClick={() => onOffsetChange(offset + 1)}>
          <ChevronRight size={14} strokeWidth={2.4} />
        </MiniChevron>
      </header>

      <div
        className="grid h-12 overflow-hidden rounded-md bg-surface-200/40"
        style={{ gridTemplateColumns: `repeat(${totalDays}, 1fr)` }}
      >
        {days.map((d) => (
          <DayBar key={d.dayKey} day={d} onSelect={onDaySelect} />
        ))}
      </div>

      <div className="mt-1 flex justify-between px-0.5 font-mono text-[8px] uppercase tracking-[0.15em] text-ink-400">
        <span>01</span>
        <span>{String(Math.round(totalDays / 2)).padStart(2, "0")}</span>
        <span>{totalDays}</span>
      </div>
    </section>
  );
}

function MiniChevron({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors duration-motion-standard hover:bg-surface-200/60 hover:text-acid-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-500"
    >
      {children}
    </button>
  );
}

function barHeightPct(count: number): number {
  if (count === 0) {
    return 0;
  }
  if (count === 1) {
    return 35;
  }
  if (count === 2) {
    return 65;
  }
  return 100;
}

function DayBar({ day, onSelect }: { day: DayMark; onSelect: (dayKey: string) => void }) {
  const we = isWeekend(day.weekday);
  const heightPct = barHeightPct(day.count);

  // Pas de gap dans le grid — chaque jour porte une border-l 1 px (sauf
  // 1er du mois et dimanche). Du coup samedi+dimanche restent collés
  // pour matérialiser le WE comme un bloc, et tous les autres jours
  // sont séparés.
  const noBorderLeft = day.dayOfMonth === 1 || day.weekday === 0;

  const wrapperClass = cn(
    "relative flex h-full w-full items-end justify-center transition-colors duration-motion-standard",
    we ? "bg-surface-300/85" : "bg-transparent",
    day.isToday && "bg-ink-700/25",
    !noBorderLeft && "border-l border-surface-50/90",
    day.count > 0 && "hover:bg-acid-500/25 focus-visible:bg-acid-500/25 focus-visible:outline-none"
  );

  const ariaLabel =
    day.count > 0
      ? `${day.dayKey} — ${day.count} événement${day.count > 1 ? "s" : ""}`
      : day.dayKey;

  const content = (
    <>
      {day.isToday && <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-ink-700/70" />}
      {day.count > 0 && (
        <span
          aria-hidden
          className="block w-full bg-acid-500"
          style={{ height: `${heightPct}%` }}
        />
      )}
    </>
  );

  if (day.count === 0) {
    return (
      <div className={wrapperClass} aria-label={ariaLabel}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(day.dayKey)}
      className={wrapperClass}
      aria-label={ariaLabel}
    >
      {content}
    </button>
  );
}
