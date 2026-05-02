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
  return new Date(year, month, 0).getDate();
}

type DayMark = {
  dayKey: string;
  dayOfMonth: number;
  weekday: number;
  count: number;
  isToday: boolean;
};

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

  const gridStyle = { gridTemplateColumns: `repeat(${totalDays}, 1fr)` };

  return (
    <section>
      <header className="mb-2 flex items-center justify-between gap-2">
        <MiniChevron label="mois précédent" onClick={() => onOffsetChange(offset - 1)}>
          <ChevronLeft size={14} strokeWidth={2.4} />
        </MiniChevron>
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-[14px] font-bold uppercase leading-none tracking-tight text-ink-700">
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

      <div className="grid h-12 overflow-hidden rounded-md bg-surface-200/40" style={gridStyle}>
        {days.map((d) => (
          <DayBar key={d.dayKey} day={d} onSelect={onDaySelect} />
        ))}
      </div>

      {/* Today marker row — glyphe ▶ hot-500 sous la colonne d'aujourd'hui,
          aligné par le même grid 1fr × N. Un cursor terminal pointant
          vers le haut, plutôt qu'un bg teinté défensif sur la colonne. */}
      <div className="mt-0.5 grid h-3" style={gridStyle} aria-hidden>
        {days.map((d) =>
          d.isToday ? (
            <span
              key={d.dayKey}
              className="flex items-start justify-center font-mono text-[8px] leading-none text-hot-500"
            >
              ▲
            </span>
          ) : (
            <span key={d.dayKey} />
          )
        )}
      </div>

      {/* Brackets terminal en lieu et place des graduations 01/16/31. Le 16
          dégage : un range entre crochets se lit comme une cote/n° de
          série, plus brand que trois nombres dispersés. */}
      <div className="mt-0.5 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-ink-400">
        <span>[ 01</span>
        <span aria-hidden className="h-px flex-1 bg-ink-400/25" />
        <span>{String(totalDays).padStart(2, "0")} ]</span>
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

// Cap min relevé à 45 % pour qu'1 event ne lise pas comme du bruit.
function barHeightPct(count: number): number {
  if (count === 0) {
    return 0;
  }
  if (count === 1) {
    return 45;
  }
  if (count === 2) {
    return 70;
  }
  return 100;
}

function DayBar({ day, onSelect }: { day: DayMark; onSelect: (dayKey: string) => void }) {
  const we = isWeekend(day.weekday);
  const heightPct = barHeightPct(day.count);
  const peak = day.count >= 3;

  // Border-l sur tous les jours sauf le 1er du mois — sam+dim ont AUSSI
  // une border interne, contrairement à la version précédente : la
  // bande WE renforcée matérialise déjà le bloc, et la border interne
  // garde la lisibilité jour par jour.
  const noBorderLeft = day.dayOfMonth === 1;

  const wrapperClass = cn(
    "relative flex h-full w-full items-end justify-center transition-colors duration-motion-standard",
    // Contraste WE renforcé : surface-400 plein au lieu de /85.
    we ? "bg-surface-400" : "bg-transparent",
    !noBorderLeft && "border-l border-surface-50/90",
    day.count > 0 && "hover:bg-acid-500/25 focus-visible:bg-acid-500/25 focus-visible:outline-none"
  );

  const ariaLabel =
    day.count > 0
      ? `${day.dayKey} — ${day.count} événement${day.count > 1 ? "s" : ""}`
      : day.dayKey;

  const content = day.count > 0 && (
    <span className="block w-full" style={{ height: `${heightPct}%` }}>
      {peak && <span aria-hidden className="block h-px w-full bg-hot-500" />}
      <span aria-hidden className="block h-full w-full bg-acid-500" />
    </span>
  );

  if (day.count === 0) {
    return <div className={wrapperClass} aria-label={ariaLabel} />;
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
