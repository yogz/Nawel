"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { AgendaMonthView } from "@/features/sortie/components/agenda-month-view";
import { bucketAgendaByDay } from "@/features/sortie/lib/agenda-grid";
import type { AgendaItem } from "@/features/sortie/queries/outing-queries";

type Props = {
  items: AgendaItem[];
  /** ISO du `now` snapshoté côté serveur — alignement même J/J+1. */
  nowIso: string;
};

/**
 * Wrapper léger autour d'`AgendaMonthView` pour la home : même calendrier
 * navigable (flèches + swipe + drawer) que `/agenda`, mais sans le hub
 * de stats ni les filtres. La diff avec la vue full d'`/agenda` reste la
 * timeline mensuelle filtrée et les pills type/RSVP — sur `/` on veut un
 * accès rapide à la grille, pas l'exploration complète.
 */
export function MiniMonthCalendar({ items, nowIso }: Props) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [monthOffset, setMonthOffset] = useState(0);
  const buckets = useMemo(() => bucketAgendaByDay(items), [items]);

  return (
    <section className="rounded-2xl bg-surface-100 p-5 ring-1 ring-white/5">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
          ─ ton calendrier ─
        </p>
        <Link
          href="/agenda"
          className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-500 underline-offset-4 transition-colors hover:text-acid-600 hover:underline"
        >
          vue détaillée
          <ArrowUpRight size={12} strokeWidth={2.4} />
        </Link>
      </header>
      <AgendaMonthView
        now={now}
        buckets={buckets}
        offset={monthOffset}
        onOffsetChange={setMonthOffset}
      />
    </section>
  );
}
