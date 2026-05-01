"use client";

import { Check, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AvatarStack } from "./avatar-stack";
import { UserAvatar } from "./user-avatar";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";
import type { EnrichedTimeslot } from "@/features/sortie/lib/enrich-timeslots";

type Props = {
  ts: EnrichedTimeslot;
  isBest: boolean;
  isChosen: boolean;
};

/**
 * Le visuel principal d'une ligne timeslot, packé dans un trigger qui
 * ouvre une bottom sheet listant tous les voteurs nominalement.
 *
 * En vue inline on reste compact : `AvatarStack` (max 4 visibles + `+N`)
 * + compteur `non` en dim. Pour découvrir qui a voté quoi en détail,
 * tap → sheet — cohérent avec le pattern déjà utilisé pour les autres
 * actions (vote-rsvp-sheet, reset-device).
 */
export function TimeslotDetailSheet({ ts, isBest, isChosen }: Props) {
  const dateLabel = formatOutingDateConversational(ts.startsAt);
  const hasAnyVote = ts.yesCount > 0 || ts.noCount > 0;

  return (
    <Sheet>
      <SheetTrigger
        disabled={!hasAnyVote}
        className="-m-1 flex w-full items-center justify-between gap-3 rounded-md p-1 text-left transition-colors duration-300 hover:bg-surface-100/60 focus-visible:bg-surface-100/60 focus-visible:outline-none disabled:pointer-events-none"
      >
        <span className={`text-sm ${isChosen ? "font-semibold text-acid-700" : "text-ink-700"}`}>
          {dateLabel}
          {isChosen && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-acid-600 px-2 py-0.5 text-[10px] font-medium tracking-wide text-surface-100 uppercase">
              choisi
            </span>
          )}
          {!isChosen && isBest && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-hot-500 bg-hot-50 px-2 py-0.5 font-mono text-[9.5px] tracking-[0.18em] text-hot-600 uppercase">
              en tête
            </span>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {ts.yesCount > 0 && (
            <AvatarStack avatars={ts.yesVoters} total={ts.yesCount} size={22} max={4} />
          )}
          {ts.noCount > 0 && (
            <span className="inline-flex items-center gap-1 font-mono text-[10.5px] tracking-[0.14em] text-ink-400 uppercase">
              <X size={11} strokeWidth={2.4} />
              {ts.noCount}
            </span>
          )}
          {!hasAnyVote && (
            <span className="font-mono text-[10.5px] tracking-[0.14em] text-ink-400 uppercase">
              ─ aucun vote ─
            </span>
          )}
        </div>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="flex max-h-[85vh] flex-col gap-4 rounded-t-2xl border-t border-surface-400 bg-surface-50"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl font-black tracking-[-0.02em] text-ink-700">
            {dateLabel}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 overflow-y-auto pr-2">
          <VoterGroup tone="yes" label="Disponibles" count={ts.yesCount} voters={ts.yesVoters} />
          {ts.noCount > 0 && (
            <VoterGroup tone="no" label="Pas dispo" count={ts.noCount} voters={ts.noVoters} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VoterGroup({
  tone,
  label,
  count,
  voters,
}: {
  tone: "yes" | "no";
  label: string;
  count: number;
  voters: EnrichedTimeslot["yesVoters"];
}) {
  const Icon = tone === "yes" ? Check : X;
  const iconClass = tone === "yes" ? "text-hot-600" : "text-ink-400";

  return (
    <section>
      <header className="mb-2 flex items-center gap-2">
        <Icon size={14} strokeWidth={2.4} className={iconClass} />
        <span className="font-mono text-[11px] tracking-[0.18em] text-ink-500 uppercase">
          {label} · {count}
        </span>
      </header>
      {voters.length === 0 ? (
        <p className="text-sm text-ink-400">Personne pour l&rsquo;instant.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {voters.map((v) => (
            <li key={v.participantId} className="flex items-center gap-3">
              <UserAvatar name={v.name} image={v.image} size={28} />
              <span className="text-sm text-ink-700">
                {v.name ?? "Quelqu’un"}
                {v.isCreator && (
                  <span className="ml-2 font-mono text-[9.5px] tracking-[0.18em] text-acid-600 uppercase">
                    organise
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
