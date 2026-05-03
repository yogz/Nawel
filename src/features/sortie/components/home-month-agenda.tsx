"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgendaMonthHeatmap } from "@/features/sortie/components/agenda-month-heatmap";
import { CompactOutingRow } from "@/features/sortie/components/compact-outing-row";
import {
  FocusableEyebrow,
  useEyebrowFocusSectionRef,
} from "@/features/sortie/components/eyebrow-focus";
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
  creatorName: string | null;
  creatorUsername: string | null;
  creatorAnonName: string | null;
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
  nowIso: string;
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
export function HomeMonthAgenda({ outings, agendaItems, viewerUserId, nowIso }: Props) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [monthOffset, setMonthOffset] = useState(0);
  const agendaSectionRef = useEyebrowFocusSectionRef<HTMLElement>("agenda");

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

  // Tap sur une cellule heatmap : scroll vers la 1re row de ce jour dans
  // la liste compacte juste en dessous, et flash 1 s pour la signaler.
  // Si plusieurs outings tombent ce jour-là, on prend simplement le 1er
  // (datée prioritaire sur sondage — déjà l'ordre dans le bucket).
  const flashTimerRef = useRef<number | null>(null);
  const flashElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
        flashElRef.current?.removeAttribute("data-flash");
      }
    };
  }, []);

  const handleDaySelect = useCallback(
    (dayKey: string) => {
      const bucket = buckets.get(dayKey);
      const firstOutingId = bucket?.fixed[0]?.outingId ?? bucket?.vote[0]?.item.outingId;
      if (!firstOutingId) {
        return;
      }
      const el = document.getElementById(`outing-row-${firstOutingId}`);
      if (!el) {
        return;
      }
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
        flashElRef.current?.removeAttribute("data-flash");
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.setAttribute("data-flash", "true");
      flashElRef.current = el;
      flashTimerRef.current = window.setTimeout(() => {
        el.removeAttribute("data-flash");
        flashTimerRef.current = null;
        flashElRef.current = null;
      }, 1000);
    },
    [buckets]
  );

  return (
    <>
      <section ref={agendaSectionRef} className="mb-10">
        <FocusableEyebrow focusId="agenda" className="mb-3">
          ─ ton agenda
        </FocusableEyebrow>
        <AgendaMonthHeatmap
          now={now}
          buckets={buckets}
          offset={monthOffset}
          onOffsetChange={setMonthOffset}
          onDaySelect={handleDaySelect}
        />
      </section>

      <section className="mb-10">
        {monthFiltered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-400 bg-surface-100/50 px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            ↳ no signal · change de mois
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {monthFiltered.map((o, idx) => (
              <li key={o.id}>
                <div
                  id={`outing-row-${o.id}`}
                  className="group/flash motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both duration-motion-emphasized ease-motion-emphasized"
                  style={{ animationDelay: `${Math.min(idx, 9) * 40}ms` }}
                >
                  <CompactOutingRow
                    outing={o}
                    resolvedRsvp={o.resolvedRsvp}
                    viewerUserId={viewerUserId}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
