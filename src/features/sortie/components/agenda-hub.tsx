import { AgendaMonthView } from "@/features/sortie/components/agenda-month-view";
import type { DayBucket } from "@/features/sortie/lib/agenda-grid";

type Props = {
  now: Date;
  buckets: Map<string, DayBucket>;
  fixedCount: number;
  voteCount: number;
};

/**
 * Hub d'agenda : stats hero (totaux fenêtre data) + calendrier mois
 * unique navigable (flèches + swipe) sans cap. Les events au-delà de la
 * fenêtre data côté serveur ne s'afficheront pas mais la nav reste libre.
 */
export function AgendaHub({ now, buckets, fixedCount, voteCount }: Props) {
  const total = fixedCount + voteCount;

  return (
    <section className="rounded-2xl bg-surface-100 p-5 ring-1 ring-white/5">
      <header className="mb-5 flex items-end justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
            ─ ton agenda ─
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

      <AgendaMonthView now={now} buckets={buckets} />
    </section>
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
