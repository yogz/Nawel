"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteDebtAction,
  setDebtStatusAction,
  updateDebtAmountAction,
} from "@/features/sortie/actions/admin-debt-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import type { DebtStatus } from "@/features/sortie/queries/admin-debt-queries";

type Props = {
  debtId: string;
  amountCents: number;
  status: DebtStatus;
  declaredAt: Date | null;
  confirmedAt: Date | null;
  debtorName: string;
  creditorName: string;
};

const STATUS_LABEL: Record<DebtStatus, string> = {
  pending: "en attente",
  declared_paid: "déclarée payée",
  confirmed: "confirmée",
};

const STATUS_TONE: Record<DebtStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  declared_paid: "bg-blue-100 text-blue-800",
  confirmed: "bg-acid-100 text-acid-700",
};

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export function AdminDebtRow({
  debtId,
  amountCents,
  status,
  declaredAt,
  confirmedAt,
  debtorName,
  creditorName,
}: Props) {
  return (
    <li className="rounded-2xl border border-surface-300 bg-surface-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink-700">
            <strong className="font-bold">{debtorName}</strong>{" "}
            <span className="text-ink-400">→</span>{" "}
            <strong className="font-bold">{creditorName}</strong>
          </p>
          <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-ink-400">
            {declaredAt ? <span>déclarée {DATE_FMT.format(declaredAt)}</span> : null}
            {confirmedAt ? <span>· confirmée {DATE_FMT.format(confirmedAt)}</span> : null}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${STATUS_TONE[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap items-center gap-2">
          <StatusForm debtId={debtId} currentStatus={status} />
          <AmountForm debtId={debtId} amountCents={amountCents} />
        </div>
        <DeleteForm debtId={debtId} />
      </div>
    </li>
  );
}

function StatusForm({ debtId, currentStatus }: { debtId: string; currentStatus: DebtStatus }) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    setDebtStatusAction,
    {} as FormActionState
  );
  const [value, setValue] = useState<DebtStatus>(currentStatus);

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="debtId" value={debtId} />
      <select
        name="status"
        value={value}
        onChange={(e) => setValue(e.target.value as DebtStatus)}
        className="h-8 rounded-md border border-surface-400 bg-surface-50 px-2 text-xs text-ink-700"
      >
        <option value="pending">en attente</option>
        <option value="declared_paid">déclarée payée</option>
        <option value="confirmed">confirmée</option>
      </select>
      <button
        type="submit"
        disabled={pending || value === currentStatus}
        className="text-xs text-acid-700 underline-offset-4 hover:underline disabled:opacity-40"
      >
        {pending ? "…" : "appliquer"}
      </button>
      {state.message && <span className="text-xs text-red-700">{state.message}</span>}
    </form>
  );
}

function AmountForm({ debtId, amountCents }: { debtId: string; amountCents: number }) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    updateDebtAmountAction,
    {} as FormActionState
  );
  const [euros, setEuros] = useState((amountCents / 100).toString());

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const cents = Math.round(parseFloat(euros) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      e.preventDefault();
      return;
    }
    if (cents === amountCents) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex items-center gap-1.5">
      <input type="hidden" name="debtId" value={debtId} />
      <input
        type="number"
        step="0.01"
        min="0.01"
        name="amountEuros"
        value={euros}
        onChange={(e) => setEuros(e.target.value)}
        className="h-8 w-20 rounded-md border border-surface-400 bg-surface-50 px-2 text-xs text-ink-700"
      />
      <input
        type="hidden"
        name="amountCents"
        value={Math.round(parseFloat(euros || "0") * 100) || 0}
      />
      <span className="text-xs text-ink-400">€</span>
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-acid-700 underline-offset-4 hover:underline disabled:opacity-40"
      >
        {pending ? "…" : "ajuster"}
      </button>
      {state.message && <span className="text-xs text-red-700">{state.message}</span>}
    </form>
  );
}

function DeleteForm({ debtId }: { debtId: string }) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    deleteDebtAction,
    {} as FormActionState
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (
      !window.confirm("Supprimer définitivement cette dette ? La row est tracée dans audit_log.")
    ) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <input type="hidden" name="debtId" value={debtId} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Supprimer cette dette"
        className="inline-flex h-8 items-center gap-1 rounded-full border border-red-300 px-3 text-xs text-red-700 transition-colors hover:border-red-600 hover:bg-red-50 disabled:opacity-40 motion-safe:active:scale-95"
      >
        <Trash2 size={12} strokeWidth={2.2} />
        {pending ? "…" : "supprimer"}
      </button>
      {state.message && <p className="mt-1 text-xs text-red-700">{state.message}</p>}
    </form>
  );
}
