"use client";

import { useActionState } from "react";
import {
  adminChangeCreatorAction,
  type AssignActionState,
} from "@/features/sortie/actions/admin-assign-actions";

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Paris",
});

type OutingOption = {
  shortId: string;
  title: string;
  fixedDatetime: Date | null;
  createdAt: Date;
};

type UserOption = {
  email: string;
  name: string;
};

type Props = {
  outings: OutingOption[];
  users: UserOption[];
};

/**
 * Form admin pour ré-attribuer une sortie à un autre user. Champs
 * minimaux (sortie + nouveau créateur) — l'action `adminChangeCreatorAction`
 * gère le nettoyage des champs anon* et le bump de sequence iCal.
 */
export function ChangeCreatorForm({ outings, users }: Props) {
  const [state, formAction, pending] = useActionState<AssignActionState, FormData>(
    adminChangeCreatorAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-5">
      <Field
        label="sortie"
        hint={`${outings.length} sorties non-annulées (plus récentes en tête).`}
      >
        <select
          name="shortId"
          required
          defaultValue=""
          className="h-12 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 text-[14px] text-ink-700 focus:border-acid-600 focus:outline-none"
        >
          <option value="" disabled>
            choisir une sortie…
          </option>
          {outings.map((o) => (
            <option key={o.shortId} value={o.shortId}>
              {formatOutingLabel(o)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="nouveau créateur" hint={`${users.length} comptes (alphabétique).`}>
        <select
          name="email"
          required
          defaultValue=""
          className="h-12 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 text-[14px] text-ink-700 focus:border-acid-600 focus:outline-none"
        >
          <option value="" disabled>
            choisir un user…
          </option>
          {users.map((u) => (
            <option key={u.email} value={u.email}>
              {u.name} — {u.email}
            </option>
          ))}
        </select>
      </Field>

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
        {pending ? "envoi…" : "changer le créateur"}
      </button>
    </form>
  );
}

function formatOutingLabel(o: OutingOption): string {
  const dateLabel = o.fixedDatetime ? DATE_FMT.format(o.fixedDatetime) : "à voter";
  return `${o.title} — ${dateLabel}`;
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
