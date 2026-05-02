"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { NavButton, WEEKDAY_LABELS } from "@/features/sortie/components/agenda-month-view";
import { buildMonthGrid, type DayBucket, type DayCell } from "@/features/sortie/lib/agenda-grid";
import { cn } from "@/lib/utils";

type Props = {
  now: Date;
  buckets: Map<string, DayBucket>;
  /** Offset contrôlé par le parent (sync avec la liste filtrée). */
  offset: number;
  onOffsetChange: (offset: number) => void;
  /** Tap sur une cellule active : remonte la dayKey au parent qui scroll
   * vers la row correspondante dans la liste compacte en dessous. */
  onDaySelect: (dayKey: string) => void;
};

const SWIPE_THRESHOLD = 60;

const slideVariants = {
  enter: (direction: 1 | -1) => ({ x: direction * 30, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: 1 | -1) => ({ x: -direction * 30, opacity: 0 }),
};

/**
 * Vue mois compacte façon Acid Cabinet — chaque cellule rend un chiffre
 * mono fantôme + des barres equalizer (datée = lime pleine, sondage =
 * hot outline, hauteur fonction du count). Coexiste avec `AgendaMonthView`
 * qui reste utilisée sur `/agenda` ; ici on optimise pour le scan home.
 */
export function AgendaMonthHeatmap({ now, buckets, offset, onOffsetChange, onDaySelect }: Props) {
  const [direction, setDirection] = useState<1 | -1>(1);

  const month = useMemo(() => buildMonthGrid(now, buckets, offset), [now, buckets, offset]);

  const goPrev = () => {
    setDirection(-1);
    onOffsetChange(offset - 1);
  };
  const goNext = () => {
    setDirection(1);
    onOffsetChange(offset + 1);
  };

  return (
    <section>
      <header className="mb-3 flex items-center justify-between gap-3">
        <NavButton label="mois précédent" onClick={goPrev}>
          <ChevronLeft size={18} strokeWidth={2.2} />
        </NavButton>
        <div className="min-w-0 flex-1 text-center">
          <h3 className="truncate font-display text-[20px] font-black uppercase leading-none tracking-tight text-ink-700">
            {month.label}
          </h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
            {month.itemCount > 0
              ? `${month.itemCount} ${month.itemCount > 1 ? "événements" : "événement"}`
              : offset === 0
                ? "rien ce mois-ci"
                : "rien"}
          </p>
        </div>
        <NavButton label="mois suivant" onClick={goNext}>
          <ChevronRight size={18} strokeWidth={2.2} />
        </NavButton>
      </header>

      <div className="mb-1.5 grid grid-cols-7 gap-px">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-center font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-md bg-surface-300/30">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={month.monthKey}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.18, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) {
                goNext();
              } else if (info.offset.x > SWIPE_THRESHOLD) {
                goPrev();
              }
            }}
            className="grid touch-pan-y grid-cols-7 gap-px"
          >
            {month.weeks
              .flat()
              .map((cell, i) =>
                cell ? (
                  <HeatmapCell
                    key={cell.dayKey}
                    cell={cell}
                    bucket={buckets.get(cell.dayKey)}
                    onSelect={onDaySelect}
                  />
                ) : (
                  <div key={`empty-${i}`} aria-hidden className="h-9 bg-surface-100" />
                )
              )}
          </motion.div>
        </AnimatePresence>

        {month.itemCount === 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-acid-500/40">
              ─ zone libre ─
            </p>
          </div>
        )}
      </div>

      {offset !== 0 && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setDirection(offset < 0 ? 1 : -1);
              onOffsetChange(0);
            }}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:text-acid-500"
          >
            ─ revenir à aujourd&apos;hui ─
          </button>
        </div>
      )}
    </section>
  );
}

// Hauteur des barres equalizer fonction du count (1, 2, 3+) — calibré
// dans une cellule h-9 (36 px) pour rester sous le chiffre fantôme du
// haut sans le toucher.
function barHeight(count: number): string {
  if (count >= 3) {
    return "h-3.5";
  }
  if (count === 2) {
    return "h-2.5";
  }
  return "h-1.5";
}

function HeatmapCell({
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
    "group/cell relative flex h-9 w-full flex-col justify-between bg-surface-100 px-1 pt-0.5 pb-1 transition-colors duration-motion-standard",
    cell.outOfWindow && "opacity-30",
    total > 0 &&
      "hover:bg-surface-200/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-acid-500"
  );

  const ariaLabel =
    total > 0
      ? `${cell.dayKey} — ${fixedCount} datée${fixedCount > 1 ? "s" : ""}, ${voteCount} sondage${voteCount > 1 ? "s" : ""}`
      : cell.dayKey;

  const content = (
    <>
      <div className="flex items-center gap-0.5 leading-none">
        {cell.isToday && (
          <span aria-hidden className="font-mono text-[7px] text-acid-500">
            ▶
          </span>
        )}
        <span
          className={cn(
            "font-mono text-[9px] tabular-nums tracking-[0.05em]",
            cell.isToday
              ? "font-display text-[11px] font-black text-acid-500"
              : total > 0
                ? "text-ink-700/55"
                : "text-ink-700/25"
          )}
        >
          {cell.dayOfMonth}
        </span>
      </div>

      {total > 0 && (
        <div className="flex items-end justify-center gap-px">
          {fixedCount > 0 && (
            <span aria-hidden className={cn("w-1 bg-acid-500", barHeight(fixedCount))} />
          )}
          {voteCount > 0 && (
            <span
              aria-hidden
              className={cn("w-1 border border-hot-500 bg-transparent", barHeight(voteCount))}
            />
          )}
        </div>
      )}

      {cell.isToday && (
        <span aria-hidden className="absolute inset-x-0.5 bottom-0 h-0.5 bg-acid-500" />
      )}
    </>
  );

  if (total === 0) {
    return (
      <div className={wrapperClass} aria-label={ariaLabel}>
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
    >
      {content}
    </button>
  );
}
