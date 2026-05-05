"use client";

import { useActionState } from "react";
import { updateNotificationPrefsAction } from "@/features/sortie/actions/notification-prefs-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  initialNotify: boolean;
};

export function NotificationPrefsForm({ initialNotify }: Props) {
  const [state, action, pending] = useActionState<FormActionState, FormData>(
    updateNotificationPrefsAction,
    {} as FormActionState
  );

  return (
    <form action={action} className="rounded-2xl border border-surface-400 bg-surface-50 p-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="notifyOnFollowedOuting"
          defaultChecked={initialNotify}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-acid-600"
        />
        <span className="flex-1">
          <span className="block font-serif text-[15px] text-ink-700">
            Nouvelles sorties d&rsquo;un user que je suis
          </span>
          <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            ↳ un email dès qu&rsquo;un suivi pose une sortie
          </span>
        </span>
      </label>
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-acid-600 px-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-surface-50 transition-colors hover:bg-acid-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-700 disabled:opacity-50"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
        {state.message && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-erreur-700">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
