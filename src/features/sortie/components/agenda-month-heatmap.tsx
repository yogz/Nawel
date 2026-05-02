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
 * Heatmap façon GitHub contributions — 7 lignes (jours de la semaine,
 * lundi-first) × N colonnes (semaines du mois). Une seule scale acid à
 * 4 paliers (1 / 2 / 3 / 4+ events). Pas de distinction type
 * datée/sondage dans la couleur — le détail se lit dans la liste sous
 * le calendrier. Today = ring acid autour de la case.
 */
export function AgendaMonthHeatmap({ now, buckets, offset, onOffsetChange, onDaySelect }: Props) {
  const month = useMemo(() => buildMonthGrid(now, buckets, offset), [now, buckets, offset]);

  // L'ordre `month.weeks.flat()` est par-semaine lundi-first :
  // [L1, M1, M1, J1, V1, S1, D1, L2, M2, ...]. Avec `grid-flow-col`
  // + `grid-rows-7`, ça remplit colonne par colonne (lundi…dimanche en
  // bas), exactement le layout GitHub.
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

      <div className="flex justify-center gap-1.5">
        <div className="grid grid-rows-7 gap-1">
          {WEEKDAY_LABELS.map((label, i) => (
            <span
              key={i}
              aria-hidden
              className="flex h-6 w-3 items-center justify-center font-mono text-[8px] uppercase tracking-[0.15em] text-ink-400"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="grid auto-cols-max grid-flow-col grid-rows-7 gap-1">
          {cells.map((cell, idx) =>
            cell ? (
              <HeatCell
                key={cell.dayKey}
                cell={cell}
                bucket={buckets.get(cell.dayKey)}
                onSelect={onDaySelect}
              />
            ) : (
              <div key={`empty-${idx}`} aria-hidden className="h-6 w-6" />
            )
          )}
        </div>
      </div>
    </section>
  );
}

// 4 paliers d'intensité acide façon GitHub. Plafond à 3+ pour tasser
// les jours hyper-chargés au max sans gradient infini.
function intensityClass(count: number): string {
  if (count === 0) {
    return "bg-surface-300/30";
  }
  if (count === 1) {
    return "bg-acid-500/30";
  }
  if (count === 2) {
    return "bg-acid-500/60";
  }
  return "bg-acid-500";
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
  const fixedCount = bucket?.fixed.length ?? 0;
  const voteCount = bucket?.vote.length ?? 0;
  const total = fixedCount + voteCount;

  const wrapperClass = cn(
    "h-6 w-6 rounded-sm transition-colors duration-motion-standard",
    intensityClass(total),
    cell.outOfWindow && "opacity-40",
    cell.isToday && "ring-1 ring-acid-500 ring-offset-1 ring-offset-surface-100",
    total > 0 &&
      "hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-500"
  );

  const ariaLabel =
    total > 0 ? `${cell.dayKey} — ${total} événement${total > 1 ? "s" : ""}` : cell.dayKey;

  if (total === 0) {
    return <div className={wrapperClass} aria-label={ariaLabel} />;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.dayKey)}
      className={wrapperClass}
      aria-label={ariaLabel}
    />
  );
}
