"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { NavButton, WEEKDAY_LABELS } from "@/features/sortie/components/agenda-month-view";
import { buildMonthGrid, type DayBucket, type DayCell } from "@/features/sortie/lib/agenda-grid";
import { cn } from "@/lib/utils";

type Props = {
  now: Date;
  buckets: Map<string, DayBucket>;
  offset: number;
  onOffsetChange: (offset: number) => void;
  onDaySelect: (dayKey: string) => void;
};

/**
 * Grille pleine largeur du mois — 7 colonnes, cellules carrées (aspect-
 * square) avec numéro du jour visible. Cases pleines en lime acid quand
 * un event est présent, intensité scale 1/2/3+ pour signaler la charge.
 * Today = ring crème pour contraste sur n'importe quel fond.
 */
export function AgendaMonthHeatmap({ now, buckets, offset, onOffsetChange, onDaySelect }: Props) {
  const month = useMemo(() => buildMonthGrid(now, buckets, offset), [now, buckets, offset]);
  const cells = useMemo(() => month.weeks.flat(), [month.weeks]);

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

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <span
            key={i}
            aria-hidden
            className="text-center font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) =>
          cell ? (
            <HeatCell
              key={cell.dayKey}
              cell={cell}
              bucket={buckets.get(cell.dayKey)}
              onSelect={onDaySelect}
            />
          ) : (
            <div key={`empty-${idx}`} aria-hidden className="aspect-square" />
          )
        )}
      </div>
    </section>
  );
}

function intensityBg(count: number): string {
  if (count === 0) {
    return "bg-surface-300/30";
  }
  if (count === 1) {
    return "bg-acid-500/45";
  }
  if (count === 2) {
    return "bg-acid-500/75";
  }
  return "bg-acid-500";
}

function intensityText(count: number): string {
  if (count === 0) {
    return "text-ink-700/40";
  }
  // Tous les paliers actifs ont assez de contraste lime pour porter du
  // surface-50 (noir) — meilleure lisibilité qu'un crème sur lime.
  return "text-surface-50";
}

function HeatCell({
  cell,
  bucket,
  onSelect,
}: {
  cell: DayCell;
  bucket: DayBucket | undefined;
  onSelect: (dayKey: string) => void;
}) {
  const total = (bucket?.fixed.length ?? 0) + (bucket?.vote.length ?? 0);

  const wrapperClass = cn(
    "flex aspect-square items-center justify-center rounded-md font-mono text-[12px] font-semibold tabular-nums transition-colors duration-motion-standard",
    intensityBg(total),
    intensityText(total),
    cell.outOfWindow && "opacity-30",
    cell.isToday && "ring-2 ring-ink-700 ring-offset-1 ring-offset-surface-100",
    total > 0 &&
      "hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-500"
  );

  const ariaLabel =
    total > 0 ? `${cell.dayKey} — ${total} événement${total > 1 ? "s" : ""}` : cell.dayKey;

  if (total === 0) {
    return (
      <div className={wrapperClass} aria-label={ariaLabel}>
        {cell.dayOfMonth}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.dayKey)}
      className={wrapperClass}
      aria-label={ariaLabel}
    >
      {cell.dayOfMonth}
    </button>
  );
}
