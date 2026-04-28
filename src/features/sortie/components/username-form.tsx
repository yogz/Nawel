"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Check, Pencil, X } from "lucide-react";
import { updateUsernameAction } from "@/features/sortie/actions/profile-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  currentUsername: string | null;
};

/**
 * Inline-editable @handle. Two visual modes inside one card:
 *
 *   - **Display** (default when a username is set): single row
 *     showing `@username` in cobalt + a muted "Modifier" button.
 *   - **Edit**: input replaces the value inline, Enregistrer /
 *     Annuler actions appear below, helper text explains the
 *     charset constraints. Submit closes edit mode on success.
 *
 * Users without a username land directly in edit mode with a
 * "Réserver ce nom" CTA — there's nothing to display yet.
 */
export function UsernameForm({ currentUsername }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(!currentUsername);
  const [value, setValue] = useState(currentUsername ?? "");
  // Wrapped action so the "close edit + refresh" side-effects run
  // from the action callback (event origin) rather than a useEffect
  // observing state — avoids the react-hooks/set-state-in-effect
  // lint warning and, in practice, fires exactly once per submit.
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    async (prev, fd) => {
      const result = await updateUsernameAction(prev, fd);
      if (!result?.errors && !result?.message) {
        router.refresh();
        setEditing(false);
      }
      return result;
    },
    {} as FormActionState
  );

  function cancelEdit() {
    setValue(currentUsername ?? "");
    setEditing(false);
  }

  // Display mode — compact single-row card with value + Modifier.
  if (!editing && currentUsername) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-surface-50 p-4 ring-1 ring-ink-700/5">
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full bg-acid-50 text-acid-600"
        >
          <AtSign size={14} strokeWidth={2.4} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-400">
            Nom d&rsquo;utilisateur
          </p>
          <p className="truncate text-sm font-semibold text-acid-700">@{currentUsername}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-ink-500 underline-offset-4 hover:text-acid-700 hover:underline"
        >
          <Pencil size={12} strokeWidth={2.2} />
          Modifier
        </button>
      </div>
    );
  }

  // Edit mode — same card shell, form content inside.
  const canSubmit = !pending && value.length > 0 && value !== currentUsername && !state.errors;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl bg-surface-50 p-4 ring-1 ring-ink-700/5 transition-shadow focus-within:ring-2 focus-within:ring-acid-600/30"
    >
      <label
        htmlFor="username"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-500"
      >
        <AtSign size={14} strokeWidth={2.2} className="text-acid-600" />
        Ton nom d&rsquo;utilisateur
      </label>
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold text-ink-300">@</span>
        <input
          id="username"
          name="username"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase().trim())}
          maxLength={30}
          placeholder="claire"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          pattern="[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]"
          autoFocus
          className="flex-1 bg-transparent text-sm text-ink-700 placeholder:text-ink-300 focus:outline-none"
        />
      </div>
      <p className="text-xs text-ink-400">
        3 à 30 caractères : minuscules, chiffres, tirets. Visible à{" "}
        <span className="font-mono">sortie.colist.fr/@{value || "ton-nom"}</span>.
      </p>
      {state.errors?.username?.[0] && (
        <p className="text-xs text-destructive">{state.errors.username[0]}</p>
      )}
      {state.message && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {state.message}
        </p>
      )}
      <div className="flex items-center justify-end gap-2 pt-1">
        {currentUsername && (
          <button
            type="button"
            onClick={cancelEdit}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-ink-500 hover:text-ink-700 disabled:opacity-50"
          >
            <X size={12} strokeWidth={2.4} />
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-9 items-center gap-1 rounded-full bg-acid-600 px-4 text-xs font-semibold text-surface-50 transition-colors hover:bg-acid-700 disabled:opacity-50"
        >
          <Check size={12} strokeWidth={3} />
          {pending ? "Enregistrement…" : currentUsername ? "Enregistrer" : "Réserver ce nom"}
        </button>
      </div>
    </form>
  );
}
