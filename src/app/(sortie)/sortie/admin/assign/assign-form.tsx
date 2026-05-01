"use client";

import { useActionState } from "react";
import { adminAssignUserToOutingAction } from "@/features/sortie/actions/admin-assign-actions";
import type { AssignActionState } from "@/features/sortie/actions/admin-assign-actions";

const RESPONSE_OPTIONS: { value: "yes" | "no" | "handle_own" | "interested"; label: string }[] = [
  { value: "yes", label: "yes — il y va" },
  { value: "handle_own", label: "handle_own — gère son propre ticket" },
  { value: "interested", label: "interested — intéressé (sondage)" },
  { value: "no", label: "no — il ne vient pas" },
];

export function AssignForm() {
  const [state, formAction, pending] = useActionState<AssignActionState, FormData>(
    adminAssignUserToOutingAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-5">
      <Field label="shortId de la sortie" hint="Les 8 derniers chars de l'URL (ex: tSHgTLPq).">
        <input
          type="text"
          name="shortId"
          required
          maxLength={8}
          autoComplete="off"
          spellCheck={false}
          placeholder="tSHgTLPq"
          className="h-12 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 font-mono text-[14px] text-ink-700 placeholder:text-ink-400 focus:border-acid-600 focus:outline-none"
        />
      </Field>

      <Field label="email du user" hint="Le compte doit déjà exister (lookup case-insensitive).">
        <input
          type="email"
          name="email"
          required
          maxLength={255}
          autoComplete="off"
          spellCheck={false}
          placeholder="ericdevaure@hotmail.fr"
          className="h-12 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 text-[14px] text-ink-700 placeholder:text-ink-400 focus:border-acid-600 focus:outline-none"
        />
      </Field>

      <Field label="response">
        <select
          name="response"
          required
          defaultValue="yes"
          className="h-12 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 text-[14px] text-ink-700 focus:border-acid-600 focus:outline-none"
        >
          {RESPONSE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="adultes en +" hint="Si yes uniquement.">
          <input
            type="number"
            name="extraAdults"
            min={0}
            max={10}
            defaultValue={0}
            className="h-12 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 text-[14px] text-ink-700 focus:border-acid-600 focus:outline-none"
          />
        </Field>
        <Field label="enfants en +" hint="Si yes uniquement.">
          <input
            type="number"
            name="extraChildren"
            min={0}
            max={10}
            defaultValue={0}
            className="h-12 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 text-[14px] text-ink-700 focus:border-acid-600 focus:outline-none"
          />
        </Field>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-900"
        >
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p
          role="status"
          className="rounded-xl border border-acid-200 bg-acid-50 px-4 py-3 text-[13px] text-acid-700"
        >
          ✓ {state.ok}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-ink-700 px-6 font-mono text-[12px] uppercase tracking-[0.18em] text-surface-50 transition-colors hover:bg-acid-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "assignation…" : "assigner"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-ink-400">{hint}</span> : null}
    </label>
  );
}
