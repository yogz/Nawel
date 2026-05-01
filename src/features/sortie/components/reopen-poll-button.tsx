"use client";

import { useActionState, useRef } from "react";
import { reopenPollAction } from "@/features/sortie/actions/outing-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = { shortId: string };

/**
 * Client island pour rouvrir un sondage clôturé. Le confirm() natif
 * sert de filet de sécurité — réouverture remet le créneau choisi
 * en jeu et permet à tout le monde de re-voter.
 */
export function ReopenPollButton({ shortId }: Props) {
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
