"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ArchivableOutingList } from "@/features/sortie/components/archivable-outing-list";
import { AgendaMonthView } from "@/features/sortie/components/agenda-month-view";
import { OutingProfileCard } from "@/features/sortie/components/outing-profile-card";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { bucketAgendaByDay, monthAtOffset } from "@/features/sortie/lib/agenda-grid";
import { parisDayKey } from "@/features/sortie/lib/date-fr";
import type { ResolvedMyRsvp } from "@/features/sortie/lib/resolve-my-rsvp";
import type { AgendaItem } from "@/features/sortie/queries/outing-queries";

export type HomeOuting = {
  id: string;
  shortId: string;
  slug: string | null;
  title: string;
  location: string | null;
  startsAt: Date | null;
  deadlineAt: Date;
  status: string;
  mode: "fixed" | "vote";
  heroImageUrl: string | null;
  creatorUserId: string | null;
  chosenTimeslotId: string | null;
  confirmedCount: number;
  /** Pré-résolu côté server pour traverser la frontière RSC sans manipuler
   * de Map<…, MyParticipantWithSlots>. */
  resolvedRsvp: ResolvedMyRsvp | null;
};

type Props = {
  /** restUpcoming (hero exclu) — la liste filtrée par mois en hérite. */
  outings: HomeOuting[];
  /** Items agenda (datés ou avec timeslots dans la fenêtre 365j) — alimente
   * le calendrier ET sert d'index "ce qui a une date" vs "à dater". */
  agendaItems: AgendaItem[];
  viewerUserId: string;
  loggedInName: string | null;
  nowIso: string;
  outingBaseUrl: string;
};

/**
 * Orchestre le couple calendrier + liste filtrée par mois sur la home.
 * Quand le user navigue d'un mois à l'autre dans `AgendaMonthView`, la
 * liste en dessous se filtre automatiquement pour ne montrer que les
 * sorties dont une date (fixedDatetime ou un candidat de sondage) tombe
 * dans le mois affiché.
 *
 * Contrat strict "list = calendar" :
 *  - Si une sortie n'a aucune date dans la fenêtre agenda (sondage sans
 *    timeslot proposé, ou legacy sans fixedDatetime), elle n'apparaît
 *    nulle part sur `/`. Cohérence avec la grille — pas de date, pas
 *    de jour, pas d'entrée. Le user la retrouve via la boîte de
 *    réception (action "choisir la date" post-deadline) ou `/agenda`.
 *  - Hero : déjà mis en avant en haut de la page, donc volontairement
 *    exclu de cette liste (passé filtré côté page via `restUpcoming`).
 *  - Mois vide : placeholder pointillé pour signifier "rien ici, le
 *    calendrier marche toujours" plutôt qu'absence muette.
 */
export function HomeMonthAgenda({
  outings,
  agendaItems,
  viewerUserId,
  loggedInName,
  nowIso,
  outingBaseUrl,
}: Props) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [monthOffset, setMonthOffset] = useState(0);

  const buckets = useMemo(() => bucketAgendaByDay(agendaItems), [agendaItems]);
  const activeMonth = useMemo(() => monthAtOffset(now, monthOffset), [now, monthOffset]);

  // Index des outings qui ont au moins une date dans la fenêtre agenda.
  // Les outings absents de cet index (sondages sans aucun timeslot, ou
  // legacy sans fixedDatetime) sont volontairement invisibles sur `/` :
  // pas de date ⇒ pas de mois ⇒ rien à afficher dans la liste filtrée
  // par mois. Le user les retrouve via la boîte de réception (action
  // "choisir la date" déclenchée par le sweeper post-deadline) ou via
  // `/agenda`.
  const agendaItemByOutingId = useMemo(() => {
    const m = new Map<string, AgendaItem>();
    for (const it of agendaItems) {
      m.set(it.outingId, it);
    }
    return m;
  }, [agendaItems]);

  // Filtrage mensuel : un outing apparaît dans la liste si une de ses
  // dates connues (fixedDate ou un candidat de sondage) tombe dans le
  // mois actif. Tri par la *date la plus tôt qui tombe dans ce mois* —
  // sinon un sondage avec un candidat le 1er juin se ferait doubler par
  // une sortie fixed le 15 juin parce que `startsAt` du sondage est null.
  const monthFiltered = useMemo(() => {
    type Matched = { outing: HomeOuting; primaryTime: number };
    const matching: Matched[] = [];
    for (const o of outings) {
      const item = agendaItemByOutingId.get(o.id);
      if (!item) {
        continue;
      }
      let earliestInMonth = Number.POSITIVE_INFINITY;
      if (item.fixedDate && parisDayKey(item.fixedDate).startsWith(activeMonth.monthKey)) {
        earliestInMonth = item.fixedDate.getTime();
      }
      for (const d of item.candidateDates) {
        if (parisDayKey(d).startsWith(activeMonth.monthKey)) {
          const t = d.getTime();
          if (t < earliestInMonth) {
            earliestInMonth = t;
          }
        }
      }
      if (earliestInMonth !== Number.POSITIVE_INFINITY) {
        matching.push({ outing: o, primaryTime: earliestInMonth });
      }
    }
    matching.sort((a, b) => a.primaryTime - b.primaryTime);
    return matching.map((m) => m.outing);
  }, [outings, agendaItemByOutingId, activeMonth.monthKey]);

  const hasArchivableInMonth = monthFiltered.some((o) => o.creatorUserId === viewerUserId);

  return (
    <>
      <section className="mb-10 rounded-2xl bg-surface-100 p-5 ring-1 ring-white/5">
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

      <section className="mb-10">
        <Eyebrow tone="hot" className="mb-3 flex items-center gap-2 text-hot-600">
          <span>─ en {activeMonth.label} ─</span>
          <span className="text-ink-400">{String(monthFiltered.length).padStart(2, "0")}</span>
        </Eyebrow>
        {monthFiltered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-400 bg-surface-100/50 px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            ↳ rien sur ce mois — navigue le calendrier
          </p>
        ) : (
          <>
            {hasArchivableInMonth && (
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
                ↳ swipe une carte vers la gauche pour l&rsquo;archiver
              </p>
            )}
            <ArchivableOutingList
              isPast={false}
              listClassName="flex flex-col gap-4"
              items={monthFiltered.map((o, idx) => ({
                row: o,
                canArchive: o.creatorUserId === viewerUserId,
                node: (
                  <div
                    className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both duration-motion-emphasized ease-motion-emphasized"
                    style={{ animationDelay: `${Math.min(idx, 9) * 40}ms` }}
                  >
                    <OutingCard outing={o} loggedInName={loggedInName} baseUrl={outingBaseUrl} />
                  </div>
                ),
              }))}
            />
          </>
        )}
      </section>
    </>
  );
}

function OutingCard({
  outing,
  loggedInName,
  baseUrl,
}: {
  outing: HomeOuting;
  loggedInName: string | null;
  baseUrl: string;
}) {
  return (
    <OutingProfileCard
      outing={outing}
      showRsvp
      myRsvp={outing.resolvedRsvp}
      loggedInName={loggedInName}
      outingBaseUrl={baseUrl}
      isPast={false}
    />
  );
}
