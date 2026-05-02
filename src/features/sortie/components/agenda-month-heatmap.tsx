"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { buildMonthGrid, type DayBucket, type DayCell } from "@/features/sortie/lib/agenda-grid";

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

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"] as const;

const SWIPE_THRESHOLD = 60;

const slideVariants = {
  enter: (direction: 1 | -1) => ({ x: direction * 30, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: 1 | -1) => ({ x: -direction * 30, opacity: 0 }),
};

/**
 * Mini-grille mois ultra-compacte (~220 px de haut total) — variante
 * heatmap d'`AgendaMonthView`. Chaque cellule rend un simple dot coloré
 * (datée / sondage / mixte / vide) sans le numéro du jour : la donnée
 * actionnable est dans la liste juste en dessous, le calendrier ne sert
 * qu'à percevoir la densité du mois et à scroll-to-row au tap.
 *
 * Réutilise `buildMonthGrid` à l'identique — aucun re-fetch ni
 * re-bucketing par rapport à `AgendaMonthView`. Coexiste avec lui :
 * `/agenda` garde la grille pleine, `/` adopte cette variante.
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

      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-center font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden">
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
            className="grid touch-pan-y grid-cols-7 gap-1"
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
                  <div key={`empty-${i}`} aria-hidden className="h-11" />
                )
              )}
          </motion.div>
        </AnimatePresence>
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

function NavButton({
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
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-200/60 text-ink-500 ring-1 ring-white/5 transition-colors duration-motion-standard hover:text-acid-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-500"
    >
      {children}
    </button>
  );
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

  const hasFixed = fixedCount > 0;
  const hasVote = voteCount > 0;
  const interactive = total > 0;

  // Dot central : couleur fonction du mix datée/sondage. Mixte = gradient
  // 50/50 acid→hot. Cas vide = micro-dot ink discret (réserve la grille
  // sans la rendre muette).
  let dotClass = "bg-ink-700/15";
  if (hasFixed && hasVote) {
    dotClass = "bg-gradient-to-r from-acid-500 from-50% to-hot-500 to-50%";
  } else if (hasFixed) {
    dotClass = "bg-acid-500";
  } else if (hasVote) {
    dotClass = "bg-hot-500";
  }

  const dotSize = total > 0 ? "h-2 w-2" : "h-1 w-1";

  const wrapperClass = `relative flex h-11 w-full items-center justify-center rounded-md transition-colors duration-motion-standard ${
    cell.isToday ? "ring-1 ring-acid-500/60" : ""
  } ${cell.outOfWindow ? "opacity-30" : ""} ${
    interactive
      ? "hover:bg-surface-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-500"
      : ""
  }`;

  const ariaLabel =
    total > 0
      ? `${cell.dayKey} — ${fixedCount} datée${fixedCount > 1 ? "s" : ""}, ${voteCount} sondage${voteCount > 1 ? "s" : ""}`
      : cell.dayKey;

  const dot = <span className={`rounded-full ${dotSize} ${dotClass}`} />;

  if (!interactive) {
    return (
      <div className={wrapperClass} aria-label={ariaLabel}>
        {dot}
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
      {dot}
    </button>
  );
}
