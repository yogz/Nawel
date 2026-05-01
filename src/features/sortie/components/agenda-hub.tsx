import { Fragment } from "react";
import type { AgendaHeatmap, DayBucket, DayCell } from "@/features/sortie/lib/agenda-grid";

type Props = {
  heatmap: AgendaHeatmap;
  buckets: Map<string, DayBucket>;
};

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"] as const;

/**
 * Hub d'agenda : un seul bloc unifié style "GitHub contributions" sur
 * 13 semaines (~3 mois glissants). Stats hero en tête, puis grille 7×13
 * avec cellules colorées par densité — datée (acid) vs sondage (hot).
 *
 * Remplace les 3 cartes-mois empilées : un seul calendrier continu plus
 * dense et lisible d'un coup d'œil sur mobile.
 */
export function AgendaHub({ heatmap, buckets }: Props) {
  const { weeks, monthLabels, fixedCount, voteCount } = heatmap;
  const total = fixedCount + voteCount;
  const weekCount = weeks.length;

  // Template colonnes : 1 col labels jours + N cols semaines, toutes en
  // `minmax(0, 1fr)` pour partager la largeur disponible à parts égales.
  const gridTemplate = `auto repeat(${weekCount}, minmax(0, 1fr))`;

  return (
    <section className="rounded-2xl bg-surface-100 p-5 ring-1 ring-white/5">
      <header className="mb-5 flex items-end justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
            ─ {weekCount} semaines · 3 mois ─
          </p>
          <p className="mt-2 font-display text-6xl font-black leading-[0.9] tracking-[-0.04em] text-ink-700">
            {total}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
            {total > 1 ? "événements à venir" : total === 1 ? "événement à venir" : "rien à venir"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatPill label="datées" value={fixedCount} tone="acid" />
          <StatPill label="sondages" value={voteCount} tone="hot" />
        </div>
      </header>

      <div className="grid gap-1" style={{ gridTemplateColumns: gridTemplate }}>
        <div aria-hidden />
        {Array.from({ length: weekCount }).map((_, col) => {
          const label = monthLabels.find((m) => m.colIndex === col)?.label ?? "";
          return (
            <div
              key={`m-${col}`}
              className="mb-1 h-3 truncate font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400"
            >
              {label}
            </div>
          );
        })}

        {WEEKDAY_LABELS.map((wd, row) => (
          <Fragment key={`row-${row}`}>
            <div className="self-center pr-1 text-right font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">
              {row === 0 || row === 2 || row === 4 || row === 6 ? wd : ""}
            </div>
            {weeks.map((week, col) => (
              <DayCellView
                key={`${col}-${row}`}
                cell={week[row]}
                bucket={buckets.get(week[row].dayKey)}
              />
            ))}
          </Fragment>
        ))}
      </div>

      <Legend />
    </section>
  );
}

function DayCellView({ cell, bucket }: { cell: DayCell; bucket: DayBucket | undefined }) {
  const fixedCount = bucket?.fixed.length ?? 0;
  const voteCount = bucket?.vote.length ?? 0;
  const total = fixedCount + voteCount;

  const isOut = cell.outOfWindow;
  const hasFixed = fixedCount > 0;
  const hasVote = voteCount > 0;

  // Intensité 1/2/3 → opacités progressives sur la couleur de base.
  const intensity = total === 0 ? 0 : total === 1 ? 1 : total === 2 ? 2 : 3;

  // Choix de la couleur de fond :
  //   vide → surface-200 (placeholder très discret, style GitHub)
  //   datée seule → acid (vert)
  //   sondage seul → hot (rose)
  //   mix → acid en fond + ring hot pour signaler le sondage
  const bgClass = hasFixed
    ? intensity === 1
      ? "bg-acid-300/30"
      : intensity === 2
        ? "bg-acid-400/55"
        : "bg-acid-500/80"
    : hasVote
      ? intensity === 1
        ? "bg-hot-400/30"
        : intensity === 2
          ? "bg-hot-500/55"
          : "bg-hot-500/80"
      : "bg-surface-200/50";

  const ringClass = hasFixed && hasVote ? "ring-1 ring-hot-500/70" : "";
  const todayRing = cell.isToday ? "ring-1 ring-acid-500" : "";
  const dimmed = isOut ? "opacity-30" : "";

  return (
    <div
      className={`aspect-square rounded-[3px] ${bgClass} ${ringClass} ${todayRing} ${dimmed} transition-colors duration-motion-standard`}
      aria-label={
        total > 0
          ? `${cell.dayKey} — ${fixedCount} datée${fixedCount > 1 ? "s" : ""}, ${voteCount} sondage${voteCount > 1 ? "s" : ""}`
          : cell.dayKey
      }
    />
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: "acid" | "hot" }) {
  const toneClass =
    tone === "acid"
      ? "bg-acid-500/15 text-acid-500 ring-acid-500/30"
      : "bg-hot-500/15 text-hot-500 ring-hot-500/30";
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className={`inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded-full px-2 font-display text-[13px] font-bold tabular-nums ring-1 ${toneClass}`}
      >
        {value}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-4 flex items-center justify-end gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">
      <span>moins</span>
      <span aria-hidden className="h-2.5 w-2.5 rounded-[2px] bg-surface-200/50" />
      <span aria-hidden className="h-2.5 w-2.5 rounded-[2px] bg-acid-300/30" />
      <span aria-hidden className="h-2.5 w-2.5 rounded-[2px] bg-acid-400/55" />
      <span aria-hidden className="h-2.5 w-2.5 rounded-[2px] bg-acid-500/80" />
      <span>plus</span>
    </div>
  );
}
