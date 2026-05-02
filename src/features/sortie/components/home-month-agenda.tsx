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
 * Cas spéciaux :
 *  - Sorties "à dater" (vote sans aucun timeslot, ou outing sans
 *    fixedDatetime) : invisibles dans le calendrier ; on les remonte
 *    dans une section persistante au-dessus pour qu'elles ne
 *    disparaissent pas de la home.
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
  // Sert à séparer "à dater" (absent du calendrier) des outings filtrables
  // par mois — sans cet index on confondrait les deux cas.
  const agendaItemByOutingId = useMemo(() => {
    const m = new Map<string, AgendaItem>();
    for (const it of agendaItems) {
      m.set(it.outingId, it);
    }
    return m;
  }, [agendaItems]);

  const undated = useMemo(
    () => outings.filter((o) => !agendaItemByOutingId.has(o.id)),
    [outings, agendaItemByOutingId]
  );

  // Filtrage mensuel : un outing apparaît dans la liste si une de ses
  // dates connues (fixedDate ou un candidat de sondage) tombe dans le
  // mois actif. Tri ascendant par date primaire pour rester lisible.
  const monthFiltered = useMemo(() => {
    const matching: HomeOuting[] = [];
    for (const o of outings) {
      const item = agendaItemByOutingId.get(o.id);
      if (!item) {
        continue;
      }
      const inMonth =
        (item.fixedDate && parisDayKey(item.fixedDate).startsWith(activeMonth.monthKey)) ||
        item.candidateDates.some((d) => parisDayKey(d).startsWith(activeMonth.monthKey));
      if (inMonth) {
        matching.push(o);
      }
    }
    matching.sort((a, b) => {
      const aTime = a.startsAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const bTime = b.startsAt?.getTime() ?? Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
    return matching;
  }, [outings, agendaItemByOutingId, activeMonth.monthKey]);

  const hasArchivableInMonth = monthFiltered.some((o) => o.creatorUserId === viewerUserId);
  const hasArchivableUndated = undated.some((o) => o.creatorUserId === viewerUserId);

  return (
    <>
      {undated.length > 0 && (
        <section className="mb-10">
          <Eyebrow tone="hot" className="mb-3 flex items-center gap-2 text-hot-600">
            <span>─ à dater ─</span>
            <span className="text-ink-400">{String(undated.length).padStart(2, "0")}</span>
          </Eyebrow>
          {hasArchivableUndated && (
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
              ↳ swipe une carte vers la gauche pour l&rsquo;archiver
            </p>
          )}
          <ArchivableOutingList
            isPast={false}
            listClassName="flex flex-col gap-4"
            items={undated.map((o) => ({
              row: o,
              canArchive: o.creatorUserId === viewerUserId,
              node: <OutingCard outing={o} loggedInName={loggedInName} baseUrl={outingBaseUrl} />,
            }))}
          />
        </section>
      )}

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
