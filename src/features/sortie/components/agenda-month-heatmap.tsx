"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { type DayBucket, monthAtOffset } from "@/features/sortie/lib/agenda-grid";
import { cn } from "@/lib/utils";

// Seuil bas (40 vs 60 avant) : les utilisateurs ne se rendaient pas
// compte que la zone était swipeable et tiraient timidement. Avec un
// fallback chevrons dans le header on peut être plus généreux sur le
// drag — un swipe court compte aussi.
const SWIPE_THRESHOLD = 40;

const slideVariants = {
  enter: (direction: 1 | -1) => ({ x: direction * 30, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: 1 | -1) => ({ x: -direction * 30, opacity: 0 }),
};

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
  const [direction, setDirection] = useState<1 | -1>(1);
  const month = useMemo(() => monthAtOffset(now, offset), [now, offset]);
  const totalDays = useMemo(() => daysInMonth(month.monthKey), [month.monthKey]);

  const goPrev = () => {
    setDirection(-1);
    onOffsetChange(offset - 1);
  };
  const goNext = () => {
    setDirection(1);
    onOffsetChange(offset + 1);
  };

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
      {/* Header en grid 3-colonnes : chevrons à gauche/droite (44px tap
          target conforme AAA) encadrent le label central. La présence
          des chevrons rend l'affordance "navigable" instantanément
          visible — le swipe restait une découverte cachée même avec la
          legend "↔ glisse" en pied. Les chevrons font tap target plein
          h-11 mais l'icône reste fine pour ne pas concurrencer le label. */}
      <header className="mb-2 grid grid-cols-[44px_1fr_44px] items-center">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Mois précédent"
          className="inline-flex h-11 w-11 items-center justify-center text-ink-400 transition-colors hover:text-acid-600 focus-visible:outline-none focus-visible:text-acid-600"
        >
          <ChevronLeft size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <Link
          href="/agenda"
          className="group inline-flex items-baseline justify-center gap-2 transition-colors hover:text-acid-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-500"
          aria-label={`Vue détaillée — ${month.label}`}
        >
          <h3 className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-700 group-hover:text-acid-600">
            {month.label}
          </h3>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-400">
            ({String(eventDayCount).padStart(2, "0")})
          </span>
          <ArrowUpRight
            size={11}
            strokeWidth={2.4}
            aria-hidden="true"
            className="text-ink-400 transition-colors group-hover:text-acid-600"
          />
        </Link>
        <button
          type="button"
          onClick={goNext}
          aria-label="Mois suivant"
          className="inline-flex h-11 w-11 items-center justify-center text-ink-400 transition-colors hover:text-acid-600 focus-visible:outline-none focus-visible:text-acid-600"
        >
          <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </header>

      <div className="overflow-hidden">
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
            // py-5 (vs py-3) agrandit la hit zone de swipe à ~50 px de
            // hauteur. Les carrés-jours font ~8 px sur mobile 360, le
            // padding vertical fait office de "champ swipeable" autour
            // sans cliquer accidentellement un jour daté (qui est un
            // bouton). `touch-pan-y` continue de laisser le scroll
            // vertical passer.
            className="grid touch-pan-y items-center gap-px py-5"
            style={{ gridTemplateColumns: `repeat(${totalDays}, 1fr)` }}
          >
            {days.map((d) => (
              <DaySquare key={d.dayKey} day={d} onSelect={onDaySelect} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
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
