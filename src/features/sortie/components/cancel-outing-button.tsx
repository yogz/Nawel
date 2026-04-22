"use client";

import { useActionState, useRef } from "react";
import { cancelOutingAction } from "@/features/sortie/actions/outing-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  shortId: string;
  outingTitle: string;
};

export function CancelOutingButton({ shortId, outingTitle }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    cancelOutingAction,
    {} as FormActionState
  );

  function handleClick() {
    const confirmed = window.confirm(
      `Annuler « ${outingTitle} » ? Tous les inscrits seront prévenus par email. L'action est définitive.`
    );
    if (confirmed) {
      formRef.current?.requestSubmit();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form ref={formRef} action={formAction} className="contents">
        <input type="hidden" name="shortId" value={shortId} />
      </form>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="self-start text-sm text-erreur-700 underline-offset-4 hover:underline disabled:opacity-50"
      >
        {pending ? "Annulation…" : "Annuler la sortie"}
      </button>
      {state.message && (
        <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
          {state.message}
        </p>
      )}
    </div>
  );
}
