"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { NavButton } from "@/features/sortie/components/agenda-month-view";
import { buildMonthGrid, type DayBucket, type DayCell } from "@/features/sortie/lib/agenda-grid";
import { cn } from "@/lib/utils";

type Props = {
  now: Date;
  buckets: Map<string, DayBucket>;
  offset: number;
  onOffsetChange: (offset: number) => void;
  onDaySelect: (dayKey: string) => void;
};

// Indexé par Date.getDay() (0 = dimanche). Lettres en français mono.
const WEEKDAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"] as const;

/**
 * Strip horizontal scrollable du mois actif — un chip par jour, ~40 px
 * de large. Plus de grille 7×N : on aplatit en une bande qu'on scrolle
 * latéralement (snap-x). Today se centre automatiquement au montage du
 * mois courant. Tap d'un chip avec event remonte la dayKey au parent
 * (qui scroll vers la row dans la liste).
 */
export function AgendaMonthStrip({ now, buckets, offset, onOffsetChange, onDaySelect }: Props) {
  const month = useMemo(() => buildMonthGrid(now, buckets, offset), [now, buckets, offset]);

  const days = useMemo(
    () => month.weeks.flat().filter((c): c is DayCell => c !== null),
    [month.weeks]
  );

  // Auto-scroll vers today au mount du mois courant. Pour les autres
  // mois, on laisse le strip au début (1er du mois).
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target =
      offset === 0
        ? stripRef.current?.querySelector<HTMLElement>("[data-today=true]")
        : stripRef.current?.firstElementChild;
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
    }
  }, [offset, month.monthKey]);

  return (
    <section>
      <header className="mb-3 flex items-center justify-between gap-3">
        <NavButton label="mois précédent" onClick={() => onOffsetChange(offset - 1)}>
          <ChevronLeft size={16} strokeWidth={2.4} />
        </NavButton>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-2">
          <h3 className="font-display text-[18px] font-black uppercase leading-none tracking-tight text-ink-700">
            {month.label}
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
            {month.itemCount > 0
              ? `${String(month.itemCount).padStart(2, "0")} évt${month.itemCount > 1 ? "s" : ""}`
              : "─"}
          </span>
        </div>
        <NavButton label="mois suivant" onClick={() => onOffsetChange(offset + 1)}>
          <ChevronRight size={16} strokeWidth={2.4} />
        </NavButton>
      </header>

      <div
        ref={stripRef}
        className="-mx-1 flex snap-x gap-1 overflow-x-auto scroll-smooth px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((cell) => (
          <DayChip
            key={cell.dayKey}
            cell={cell}
            bucket={buckets.get(cell.dayKey)}
            onSelect={onDaySelect}
          />
        ))}
      </div>
    </section>
  );
}

function DayChip({
  cell,
  bucket,
  onSelect,
}: {
  cell: DayCell;
  bucket: DayBucket | undefined;
  onSelect: (dayKey: string) => void;
}) {
  const fixedCount = bucket?.fixed.length ?? 0;
  const voteCount = bucket?.vote.length ?? 0;
  const total = fixedCount + voteCount;

  const weekdayLetter = WEEKDAY_LETTERS[cell.date.getDay()];

  const wrapperClass = cn(
    "relative flex h-14 w-10 shrink-0 snap-start flex-col items-center justify-between rounded-md py-1.5 transition-colors duration-motion-standard",
    cell.isToday ? "bg-acid-500" : "bg-surface-100",
    cell.outOfWindow && !cell.isToday && "opacity-30",
    total > 0 &&
      !cell.isToday &&
      "hover:bg-surface-200/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-acid-500"
  );

  const weekdayClass = cn(
    "font-mono text-[8px] uppercase tracking-[0.15em]",
    cell.isToday ? "text-surface-50/70" : "text-ink-400"
  );

  const dayClass = cn(
    "font-display text-[14px] font-black leading-none tabular-nums",
    cell.isToday ? "text-surface-50" : total > 0 ? "text-ink-700" : "text-ink-700/40"
  );

  const ariaLabel =
    total > 0
      ? `${cell.dayKey} — ${fixedCount} datée${fixedCount > 1 ? "s" : ""}, ${voteCount} sondage${voteCount > 1 ? "s" : ""}`
      : cell.dayKey;

  const content = (
    <>
      <span className={weekdayClass}>{weekdayLetter}</span>
      <span className={dayClass}>{cell.dayOfMonth}</span>
      <div className="flex h-1 items-center justify-center gap-0.5">
        {fixedCount > 0 && (
          <span
            aria-hidden
            className={cn("h-1 w-1 rounded-full", cell.isToday ? "bg-surface-50" : "bg-acid-500")}
          />
        )}
        {voteCount > 0 && (
          <span
            aria-hidden
            className={cn(
              "h-1 w-1 rounded-full border",
              cell.isToday ? "border-surface-50 bg-transparent" : "border-hot-500 bg-transparent"
            )}
          />
        )}
      </div>
    </>
  );

  const dataTodayProp = cell.isToday ? { "data-today": true as const } : {};

  if (total === 0) {
    return (
      <div className={wrapperClass} aria-label={ariaLabel} {...dataTodayProp}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.dayKey)}
      className={wrapperClass}
      aria-label={ariaLabel}
      {...dataTodayProp}
    >
      {content}
    </button>
  );
}
