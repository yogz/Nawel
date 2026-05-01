"use client";

import { useActionState, useRef } from "react";
import { Check, X } from "lucide-react";
import { pickTimeslotAction, reopenPollAction } from "@/features/sortie/actions/outing-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";
import type { EnrichedTimeslot } from "@/features/sortie/lib/enrich-timeslots";

type Props = {
  shortId: string;
  timeslots: EnrichedTimeslot[];
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
  // On ne signale visuellement le "meilleur" créneau que s'il y a UN
  // gagnant clair — quand plusieurs créneaux sont à égalité (ou tous
  // à zéro), border le rose hot sur tous les rangs revient à dire
  // "n'importe lequel" et noie la signal value de la couleur.
  const bestCandidates = best > 0 ? timeslots.filter((t) => t.yesCount === best).length : 0;
  const hasUniqueBest = bestCandidates === 1;
  // Total votes is what gates the pick affordance — yesCount + noCount across
  // every timeslot. Distinct from `totalVoters` which counts unique participants
  // (a participant who voted on 3 slots counts once there, but contributes 3
  // here). We need the "any vote at all" signal, hence this sum.
  const totalVotes = timeslots.reduce((acc, t) => acc + t.yesCount + t.noCount, 0);
  const canPick = isCreator && !chosenTimeslotId && totalVotes > 0;

  return (
    <section
      className="mt-8 rounded-2xl border border-surface-400 bg-surface-50 p-5"
      aria-label="Vote de créneaux"
    >
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="font-serif text-lg text-ink-700">
          {chosenTimeslotId ? "Sondage clôturé" : "Votes en cours"}
        </h2>
        <span className="text-xs text-ink-400">
          {totalVoters === 0
            ? "Personne n'a voté"
            : `${totalVoters} vote${totalVoters > 1 ? "s" : ""}`}
        </span>
      </header>

      <ul className="flex flex-col gap-2">
        {timeslots.map((ts) => (
          <TimeslotRowView
            key={ts.id}
            shortId={shortId}
            ts={ts}
            isBest={hasUniqueBest && ts.yesCount === best}
            isChosen={ts.id === chosenTimeslotId}
            isCreator={isCreator}
            canPick={canPick}
          />
        ))}
      </ul>

      {isCreator && !chosenTimeslotId && totalVotes === 0 && (
        <p className="mt-3 text-xs text-ink-400">
          Personne n&rsquo;a encore voté — partage le lien d&rsquo;abord, sinon tu figeras le
          sondage à l&rsquo;aveugle et plus personne ne pourra voter.
        </p>
      )}

      {isCreator && chosenTimeslotId && <ReopenPollButton shortId={shortId} />}
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
  ts: EnrichedTimeslot;
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
          ? "border-acid-600 bg-acid-50"
          : isBest
            ? "border-hot-500 bg-surface-100"
            : "border-surface-400 bg-surface-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`text-sm ${isChosen ? "font-semibold text-acid-700" : "text-ink-700"}`}>
          {formatOutingDateConversational(ts.startsAt)}
          {isChosen && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-acid-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-surface-100">
              choisi
            </span>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-3 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <Check size={12} className="text-hot-600" />
            {ts.yesCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <X size={12} className="text-ink-400" />
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
            // Action critique (fige le sondage) — on la rend
            // intentionnellement discrète pour qu'elle ne soit pas
            // confondue avec un CTA quotidien. Le confirm modal du
            // handler fait déjà le filet de sécurité côté UX.
            className="self-end font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400 underline-offset-4 transition-colors duration-300 hover:text-acid-600 hover:underline disabled:opacity-50"
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

function ReopenPollButton({ shortId }: { shortId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    reopenPollAction,
    {} as FormActionState
  );

  function handleClick() {
    const confirmed = window.confirm(
      "Rouvrir le sondage ? Le créneau choisi sera remis en jeu et les invités pourront re-voter."
    );
    if (confirmed) {
      formRef.current?.requestSubmit();
    }
  }

  return (
    <div className="mt-4 border-t border-surface-400 pt-3">
      <form ref={formRef} action={formAction} className="contents">
        <input type="hidden" name="shortId" value={shortId} />
      </form>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="text-xs text-acid-700 underline-offset-4 hover:underline disabled:opacity-50"
      >
        {pending ? "Réouverture…" : "Rouvrir le sondage"}
      </button>
      {state.message && <p className="mt-1 text-xs text-erreur-700">{state.message}</p>}
    </div>
  );
}
