"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { AgendaDayDrawer } from "@/features/sortie/components/agenda-day-drawer";
import {
  AGENDA_WINDOW_DAYS,
  buildMonthGrid,
  type DayBucket,
  type DayCell,
} from "@/features/sortie/lib/agenda-grid";

type Props = {
  now: Date;
  buckets: Map<string, DayBucket>;
  /** Offset contrôlé par le parent (sync avec la timeline filtrée). */
  offset: number;
  onOffsetChange: (offset: number) => void;
};

export const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"] as const;

// Seuil pixels au-delà duquel un drag horizontal est interprété comme
// changement de mois. < 60 px ramène à l'élastique sans navigation.
const SWIPE_THRESHOLD = 60;

// Variants direction-aware : la nouvelle grille rentre depuis le côté
// du geste (drag vers la gauche → mois suivant rentre depuis la droite).
// Passe `direction` via la prop `custom` de motion + AnimatePresence.
const slideVariants = {
  enter: (direction: 1 | -1) => ({ x: direction * 40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: 1 | -1) => ({ x: -direction * 40, opacity: 0 }),
};

/**
 * Vue mois unique avec navigation par flèches + swipe horizontal
 * (framer-motion drag). Pas de cap sur le nombre de mois — le user peut
 * dériver dans le futur autant qu'il veut, les mois hors fenêtre data
 * affichent leur grille mais grisée.
 */
export function AgendaMonthView({ now, buckets, offset, onOffsetChange }: Props) {
  // Direction du dernier swap : sert à orienter l'animation enter/exit
  // pour que le mois entrant glisse depuis le côté "naturel" du geste.
  // Reste local — l'offset est contrôlé par le parent, mais le sens
  // d'animation est purement visuel et n'a pas besoin de remonter.
  const [direction, setDirection] = useState<1 | -1>(1);
  // dayKey du jour ouvert dans le drawer (null = fermé). Local : le
  // drawer est interne au calendrier, pas besoin de remonter au parent.
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Fenêtre symétrique sur /agenda : les mois passés dans l'horizon
  // `AGENDA_WINDOW_DAYS` ne doivent pas être grisés, sinon le user ne
  // peut pas browse son historique.
  const month = useMemo(
    () => buildMonthGrid(now, buckets, offset, AGENDA_WINDOW_DAYS, AGENDA_WINDOW_DAYS),
    [now, buckets, offset]
  );

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
            className="grid touch-pan-y grid-cols-7 gap-1.5"
          >
            {month.weeks
              .flat()
              .map((cell, i) =>
                cell ? (
                  <BigDayCell
                    key={cell.dayKey}
                    cell={cell}
                    bucket={buckets.get(cell.dayKey)}
                    onSelect={setSelectedDayKey}
                  />
                ) : (
                  <div key={`empty-${i}`} aria-hidden className="aspect-square" />
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

      <AgendaDayDrawer
        dayKey={selectedDayKey}
        bucket={selectedDayKey ? buckets.get(selectedDayKey) : undefined}
        onClose={() => setSelectedDayKey(null)}
      />
    </section>
  );
}

export function NavButton({
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

function BigDayCell({
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

  // Cap à 3+3 dots visibles : au-delà, on ajoute "+N" pour signaler
  // l'overflow sans surcharger une cellule de ~60 px.
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
  // Cellules vides : non-cliquables, juste un placeholder visuel.
  // Cellules avec events : <button> qui ouvre le drawer du jour.
  const interactiveClass = interactive
    ? "cursor-pointer hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-500"
    : "cursor-default";

  const className = `flex aspect-square flex-col rounded-lg p-1.5 text-left ${bgClass} ${todayRing} ${dimmed} ${interactiveClass} transition-all duration-motion-standard`;
  const ariaLabel =
    total > 0
      ? `${cell.dayKey} — ${fixedCount} datée${fixedCount > 1 ? "s" : ""}, ${voteCount} sondage${voteCount > 1 ? "s" : ""}`
      : cell.dayKey;

  const content = (
    <>
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
    </>
  );

  if (!interactive) {
    return (
      <div className={className} aria-label={ariaLabel}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.dayKey)}
      className={className}
      aria-label={ariaLabel}
    >
      {content}
    </button>
  );
}
