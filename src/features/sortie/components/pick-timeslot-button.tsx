"use client";

import { useActionState, useRef } from "react";
import { pickTimeslotAction } from "@/features/sortie/actions/outing-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";

type Props = {
  shortId: string;
  timeslotId: string;
  startsAt: Date;
};

/**
 * Client island isolé pour figer un créneau. Garde son propre
 * `useActionState` pour que l'éventuel message d'erreur reste collé
 * à la ligne qui a soumis (chaque instance porte son state). Le
 * confirm() natif fait office de filet — l'action est destructive
 * (notifie tous les inscrits).
 */
export function PickTimeslotButton({ shortId, timeslotId, startsAt }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    pickTimeslotAction,
    {} as FormActionState
  );

  function handleClick() {
    const confirmed = window.confirm(
      `Choisir ${formatOutingDateConversational(startsAt)} ? Tous les inscrits seront prévenus.`
    );
    if (confirmed) {
      formRef.current?.requestSubmit();
    }
  }

  return (
    <>
      <form ref={formRef} action={formAction} className="contents">
        <input type="hidden" name="shortId" value={shortId} />
        <input type="hidden" name="timeslotId" value={timeslotId} />
      </form>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="self-end font-mono text-[10.5px] tracking-[0.18em] text-ink-400 uppercase underline-offset-4 transition-colors duration-300 hover:text-acid-600 hover:underline disabled:opacity-50"
      >
        {pending ? "Choix en cours…" : "Choisir ce créneau"}
      </button>
      {state.message && <p className="text-xs text-erreur-700">{state.message}</p>}
    </>
  );
}
