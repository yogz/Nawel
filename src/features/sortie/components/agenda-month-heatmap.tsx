"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { NavButton } from "@/features/sortie/components/agenda-month-view";
import { type DayBucket, monthAtOffset } from "@/features/sortie/lib/agenda-grid";
import { parisDayKey } from "@/features/sortie/lib/date-fr";
import { cn } from "@/lib/utils";

type Props = {
  now: Date;
  buckets: Map<string, DayBucket>;
  offset: number;
  onOffsetChange: (offset: number) => void;
  onDaySelect: (dayKey: string) => void;
};

// Indexé par Date.getDay() (0 = dimanche). Convention WE = sam/dim → lime.
const WEEKDAY_SHORT = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"] as const;

function isWeekend(weekday: number): boolean {
  return weekday === 0 || weekday === 6;
}

type ActiveDay = {
  dayKey: string;
  dayOfMonth: number;
  weekday: number;
  isToday: boolean;
};

/**
 * Vue mois inline ultra-compacte — pas de grille. On liste juste les
 * jours du mois actif qui ont au moins un event, en typo signée. Les
 * WE (samedi/dimanche) sont colorés acid pour qu'on repère d'un coup
 * d'œil les events du week-end vs les events de semaine. Tap d'un chip
 * scroll vers la row dans la liste sous le calendrier.
 */
export function AgendaMonthHeatmap({ now, buckets, offset, onOffsetChange, onDaySelect }: Props) {
  const month = useMemo(() => monthAtOffset(now, offset), [now, offset]);
  const todayKey = useMemo(() => parisDayKey(now), [now]);

  const activeDays = useMemo<ActiveDay[]>(() => {
    const out: ActiveDay[] = [];
    for (const [dayKey, bucket] of buckets) {
      if (!dayKey.startsWith(month.monthKey)) {
        continue;
      }
      if (bucket.fixed.length + bucket.vote.length === 0) {
        continue;
      }
      // bucket.date est à midi Paris — getDate / getDay restent corrects
      // côté client tant qu'on lit les composantes locales du Date.
      out.push({
        dayKey,
        dayOfMonth: bucket.date.getDate(),
        weekday: bucket.date.getDay(),
        isToday: dayKey === todayKey,
      });
    }
    out.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
    return out;
  }, [buckets, month.monthKey, todayKey]);

  const eventCount = activeDays.length;

  return (
    <section className="flex items-center gap-2">
      <NavButton label="mois précédent" onClick={() => onOffsetChange(offset - 1)}>
        <ChevronLeft size={14} strokeWidth={2.4} />
      </NavButton>

      <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-center gap-x-3 gap-y-1.5">
        <h3 className="font-display text-[16px] font-black uppercase leading-none tracking-tight text-ink-700">
          {month.label}
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
          {eventCount > 0
            ? `${String(eventCount).padStart(2, "0")} jour${eventCount > 1 ? "s" : ""}`
            : "─"}
        </span>

        {activeDays.length > 0 && (
          <>
            <span aria-hidden className="font-mono text-[10px] text-ink-500">
              ─
            </span>
            <ul className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
              {activeDays.map((d) => (
                <li key={d.dayKey}>
                  <DayChip day={d} onSelect={onDaySelect} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <NavButton label="mois suivant" onClick={() => onOffsetChange(offset + 1)}>
        <ChevronRight size={14} strokeWidth={2.4} />
      </NavButton>
    </section>
  );
}

function DayChip({ day, onSelect }: { day: ActiveDay; onSelect: (dayKey: string) => void }) {
  const we = isWeekend(day.weekday);
  return (
    <button
      type="button"
      onClick={() => onSelect(day.dayKey)}
      aria-label={`${day.dayKey}${day.isToday ? " — aujourd'hui" : ""}`}
      className={cn(
        "group/chip inline-flex items-baseline gap-1 rounded px-1 py-0.5 font-mono uppercase tracking-[0.12em] transition-colors duration-motion-standard hover:bg-acid-500/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-acid-500",
        day.isToday && "bg-ink-700/10 ring-1 ring-ink-700/30",
        we ? "text-acid-500" : "text-ink-700"
      )}
    >
      <span className="text-[13px] font-bold tabular-nums leading-none">
        {String(day.dayOfMonth).padStart(2, "0")}
      </span>
      <span className="text-[8px] leading-none opacity-70">{WEEKDAY_SHORT[day.weekday]}</span>
    </button>
  );
}
