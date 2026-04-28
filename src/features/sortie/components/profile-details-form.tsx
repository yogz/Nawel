"use client";

import { useActionState, useState } from "react";
import { Check, MessageSquareQuote } from "lucide-react";
import { updateProfileDetailsAction } from "@/features/sortie/actions/profile-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  bio: string | null;
};

/**
 * Bio-only form on /moi. Single rounded card with an icon label,
 * transparent textarea inside, 160-char counter + inline errors.
 * Matches the app's card vocabulary (ring-1, surface-50, focus-within
 * cobalt ring).
 */
export function ProfileDetailsForm({ bio }: Props) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    updateProfileDetailsAction,
    {} as FormActionState
  );
  const [bioValue, setBioValue] = useState(bio ?? "");

  const bioCount = bioValue.length;
  const bioAtLimit = bioCount >= 160;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl bg-surface-50 p-4 ring-1 ring-ink-700/5 transition-shadow focus-within:ring-2 focus-within:ring-acid-600/30">
        <label
          htmlFor="bio"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-500"
        >
          <MessageSquareQuote size={14} strokeWidth={2.2} className="text-acid-600" />
          Ta bio
        </label>
        <textarea
          id="bio"
          name="bio"
          value={bioValue}
          onChange={(e) => setBioValue(e.target.value.slice(0, 160))}
          maxLength={160}
          rows={3}
          placeholder="En une ligne, tu sors où&nbsp;?"
          className="w-full resize-none bg-transparent text-sm text-ink-700 placeholder:text-ink-300 focus:outline-none"
        />
        <div className="flex items-center justify-between">
          <p className={`text-xs ${bioAtLimit ? "text-destructive" : "text-ink-300"}`}>
            {bioCount}/160
          </p>
          {state.errors?.bio?.[0] && (
            <p className="text-xs text-destructive">{state.errors.bio[0]}</p>
          )}
        </div>
      </div>

      {state.message && !state.errors && (
        <p className="inline-flex items-center gap-1 text-xs font-semibold text-acid-700">
          <Check size={12} strokeWidth={3} />
          {state.message}
        </p>
      )}
      {state.message && state.errors && <p className="text-xs text-destructive">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-acid-600 px-5 text-sm font-semibold text-surface-50 transition-colors hover:bg-acid-700 disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
