"use client";

import { useState } from "react";
import type { DayBucket, DayCell, MonthGrid } from "@/features/sortie/lib/agenda-grid";

type Props = {
  months: MonthGrid[];
  buckets: Map<string, DayBucket>;
};

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"] as const;

/**
 * Vue mois unique avec onglets [mai] [juin] [juil]. Cellules ~2× plus
 * grandes que le heatmap dense, numéros de jour visibles, dots de
 * couleur pour signaler les events. Remplace les 3 cartes empilées :
 * un seul mois affiché, navigation par onglet.
 */
export function AgendaMonthView({ months, buckets }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const month = months[activeIndex];

  if (!month) {
    return null;
  }

  return (
    <section>
      <MonthTabs months={months} activeIndex={activeIndex} onSelect={setActiveIndex} />

      <header className="mb-3">
        <h3 className="font-display text-[22px] font-black uppercase leading-none tracking-tight text-ink-700">
          {month.label}
        </h3>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
          {month.itemCount > 0
            ? `${month.itemCount} ${month.itemCount > 1 ? "événements" : "événement"}`
            : "rien ce mois-ci"}
        </p>
      </header>

      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-center font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {month.weeks
          .flat()
          .map((cell, i) =>
            cell ? (
              <BigDayCell key={cell.dayKey} cell={cell} bucket={buckets.get(cell.dayKey)} />
            ) : (
              <div key={`empty-${i}`} aria-hidden className="aspect-square" />
            )
          )}
      </div>
    </section>
  );
}

function MonthTabs({
  months,
  activeIndex,
  onSelect,
}: {
  months: MonthGrid[];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="mb-4 flex gap-1 rounded-full bg-surface-200/60 p-1">
      {months.map((m, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={m.monthKey}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(i)}
            className={`flex-1 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-motion-standard ${
              active
                ? "bg-surface-100 text-ink-700 ring-1 ring-acid-500/30"
                : "text-ink-400 hover:text-ink-600"
            }`}
          >
            {m.shortLabel}
            {m.itemCount > 0 && (
              <span
                className={`ml-1.5 font-mono text-[9px] tabular-nums ${
                  active ? "text-acid-500" : "text-ink-500"
                }`}
              >
                {m.itemCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function BigDayCell({ cell, bucket }: { cell: DayCell; bucket: DayBucket | undefined }) {
  const fixedCount = bucket?.fixed.length ?? 0;
  const voteCount = bucket?.vote.length ?? 0;
  const total = fixedCount + voteCount;

  const hasFixed = fixedCount > 0;
  const hasVote = voteCount > 0;

  // Cap à 4 dots visibles : au-delà, on ajoute "+N" pour signaler
  // l'overflow sans surcharger une cellule de 60 px.
  const fixedDotsShown = Math.min(fixedCount, 3);
  const voteDotsShown = Math.min(voteCount, 3);
  const overflow = fixedCount + voteCount - (fixedDotsShown + voteDotsShown);

  const bgClass =
    hasFixed && hasVote
      ? "bg-acid-500/10 ring-1 ring-hot-500/40"
      : hasFixed
        ? "bg-acid-500/10 ring-1 ring-acid-500/25"
        : hasVote
          ? "bg-hot-500/10 ring-1 ring-hot-500/25"
          : "bg-surface-200/40";

  const todayRing = cell.isToday ? "ring-2 ring-acid-500" : "";
  const dimmed = cell.outOfWindow ? "opacity-30" : "";

  return (
    <div
      className={`flex aspect-square flex-col rounded-lg p-1.5 ${bgClass} ${todayRing} ${dimmed} transition-colors duration-motion-standard`}
      aria-label={
        total > 0
          ? `${cell.dayKey} — ${fixedCount} datée${fixedCount > 1 ? "s" : ""}, ${voteCount} sondage${voteCount > 1 ? "s" : ""}`
          : cell.dayKey
      }
    >
      <span
        className={`font-mono text-[11px] leading-none tabular-nums ${
          total > 0 || cell.isToday ? "font-bold text-ink-700" : "text-ink-500"
        }`}
      >
        {cell.dayOfMonth}
      </span>
      {total > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-0.5">
          {Array.from({ length: fixedDotsShown }).map((_, i) => (
            <span key={`f-${i}`} className="h-1 w-1 rounded-full bg-acid-500" />
          ))}
          {Array.from({ length: voteDotsShown }).map((_, i) => (
            <span key={`v-${i}`} className="h-1 w-1 rounded-full bg-hot-500" />
          ))}
          {overflow > 0 && (
            <span className="ml-0.5 font-mono text-[8px] leading-none tabular-nums text-ink-500">
              +{overflow}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
