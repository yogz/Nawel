"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { type DayBucket, monthAtOffset } from "@/features/sortie/lib/agenda-grid";
import { cn } from "@/lib/utils";

type Props = {
  now: Date;
  buckets: Map<string, DayBucket>;
  offset: number;
  onOffsetChange: (offset: number) => void;
  onDaySelect: (dayKey: string) => void;
};

function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

type DayMark = {
  dayKey: string;
  dayOfMonth: number;
  hasFixed: boolean;
  hasVote: boolean;
};

export function AgendaMonthHeatmap({ now, buckets, offset, onOffsetChange, onDaySelect }: Props) {
  const month = useMemo(() => monthAtOffset(now, offset), [now, offset]);
  const totalDays = useMemo(() => daysInMonth(month.monthKey), [month.monthKey]);

  const days = useMemo<DayMark[]>(() => {
    const out: DayMark[] = [];
    for (let d = 1; d <= totalDays; d++) {
      const dayKey = `${month.monthKey}-${String(d).padStart(2, "0")}`;
      const bucket = buckets.get(dayKey);
      out.push({
        dayKey,
        dayOfMonth: d,
        hasFixed: (bucket?.fixed.length ?? 0) > 0,
        hasVote: (bucket?.vote.length ?? 0) > 0,
      });
    }
    return out;
  }, [buckets, month.monthKey, totalDays]);

  const eventDayCount = days.filter((d) => d.hasFixed || d.hasVote).length;

  return (
    <section>
      <header className="mb-2 flex items-baseline justify-center gap-2">
        <h3 className="font-display text-[14px] font-bold uppercase leading-none tracking-tight text-ink-700">
          {month.label}
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
          ({String(eventDayCount).padStart(2, "0")})
        </span>
      </header>

      <div className="flex items-center gap-2">
        <MiniChevron label="mois précédent" onClick={() => onOffsetChange(offset - 1)}>
          <ChevronLeft size={14} strokeWidth={2.4} />
        </MiniChevron>
        <div
          className="grid flex-1 items-center gap-px"
          style={{ gridTemplateColumns: `repeat(${totalDays}, 1fr)` }}
        >
          {days.map((d) => (
            <DaySquare key={d.dayKey} day={d} onSelect={onDaySelect} />
          ))}
        </div>
        <MiniChevron label="mois suivant" onClick={() => onOffsetChange(offset + 1)}>
          <ChevronRight size={14} strokeWidth={2.4} />
        </MiniChevron>
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

function DaySquare({ day, onSelect }: { day: DayMark; onSelect: (dayKey: string) => void }) {
  const hasEvent = day.hasFixed || day.hasVote;

  // Carré aspect-square — la largeur 1fr du grid détermine la taille
  // (~8 px sur mobile 360 px). Vide = surface neutre, datée = lime,
  // sondage = rose, mixte = split diagonal 45°.
  const squareClass = cn(
    "block aspect-square w-full transition-colors duration-motion-standard",
    !hasEvent && "bg-surface-300/50",
    day.hasFixed && day.hasVote && "bg-gradient-to-tr from-acid-500 from-50% to-hot-500 to-50%",
    day.hasFixed && !day.hasVote && "bg-acid-500",
    !day.hasFixed && day.hasVote && "bg-hot-500",
    hasEvent && "hover:brightness-110 focus-visible:outline-none focus-visible:brightness-110"
  );

  const typeLabel =
    day.hasFixed && day.hasVote ? "datée + sondage" : day.hasFixed ? "datée" : "sondage";
  const ariaLabel = hasEvent ? `${day.dayKey} — ${typeLabel}` : day.dayKey;

  if (!hasEvent) {
    return <div className={squareClass} aria-label={ariaLabel} />;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(day.dayKey)}
      className={squareClass}
      aria-label={ariaLabel}
    />
  );
}
