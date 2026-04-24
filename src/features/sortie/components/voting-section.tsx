"use client";

import { useActionState, useRef } from "react";
import { Check, X } from "lucide-react";
import { pickTimeslotAction } from "@/features/sortie/actions/outing-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";

type TimeslotRow = {
  id: string;
  startsAt: Date;
  yesCount: number;
  noCount: number;
};

type Props = {
  shortId: string;
  timeslots: TimeslotRow[];
  totalVoters: number;
  isCreator: boolean;
  chosenTimeslotId: string | null;
};

export function VotingSection({
  shortId,
  timeslots,
  totalVoters,
  isCreator,
  chosenTimeslotId,
}: Props) {
  const best = timeslots.reduce((acc, t) => Math.max(acc, t.yesCount), 0);

  return (
    <section
      className="mt-8 rounded-2xl border border-ivoire-400 bg-ivoire-50 p-5"
      aria-label="Vote de créneaux"
    >
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="font-serif text-lg text-encre-700">
          {chosenTimeslotId ? "Sondage clôturé" : "Votes en cours"}
        </h2>
        <span className="text-xs text-encre-400">
          {totalVoters === 0
            ? "Personne n'a voté"
            : `${totalVoters} ${totalVoters > 1 ? "votant·es" : "votant·e"}`}
        </span>
      </header>

      <ul className="flex flex-col gap-2">
        {timeslots.map((ts) => (
          <TimeslotRowView
            key={ts.id}
            shortId={shortId}
            ts={ts}
            isBest={best > 0 && ts.yesCount === best}
            isChosen={ts.id === chosenTimeslotId}
            isCreator={isCreator}
            canPick={isCreator && !chosenTimeslotId}
          />
        ))}
      </ul>
    </section>
  );
}

function TimeslotRowView({
  shortId,
  ts,
  isBest,
  isChosen,
  isCreator,
  canPick,
}: {
  shortId: string;
  ts: TimeslotRow;
  isBest: boolean;
  isChosen: boolean;
  isCreator: boolean;
  canPick: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    pickTimeslotAction,
    {} as FormActionState
  );

  function handleClick() {
    const confirmed = window.confirm(
      `Choisir ${formatOutingDateConversational(ts.startsAt)} ? Tous les inscrits seront prévenus.`
    );
    if (confirmed) {
      formRef.current?.requestSubmit();
    }
  }

  return (
    <li
      className={`flex flex-col gap-2 rounded-lg border p-3 ${
        isChosen
          ? "border-bordeaux-600 bg-bordeaux-50"
          : isBest
            ? "border-or-500 bg-ivoire-100"
            : "border-ivoire-400 bg-ivoire-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`text-sm ${isChosen ? "font-semibold text-bordeaux-700" : "text-encre-700"}`}
        >
          {formatOutingDateConversational(ts.startsAt)}
          {isChosen && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-bordeaux-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ivoire-100">
              choisi
            </span>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-3 text-xs text-encre-500">
          <span className="inline-flex items-center gap-1">
            <Check size={12} className="text-or-600" />
            {ts.yesCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <X size={12} className="text-encre-400" />
            {ts.noCount}
          </span>
        </div>
      </div>

      {canPick && (
        <>
          <form ref={formRef} action={formAction} className="contents">
            <input type="hidden" name="shortId" value={shortId} />
            <input type="hidden" name="timeslotId" value={ts.id} />
          </form>
          <button
            type="button"
            onClick={handleClick}
            disabled={pending}
            className="self-end text-xs text-bordeaux-700 underline-offset-4 hover:underline disabled:opacity-50"
          >
            {pending ? "Choix en cours…" : "Choisir ce créneau"}
          </button>
          {state.message && <p className="text-xs text-erreur-700">{state.message}</p>}
        </>
      )}

      {isCreator && !canPick && !isChosen && state.message && (
        <p className="text-xs text-erreur-700">{state.message}</p>
      )}
    </li>
  );
}
