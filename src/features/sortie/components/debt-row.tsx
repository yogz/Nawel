"use client";

import { useActionState, useState, useTransition } from "react";
import { Copy, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import {
  confirmDebtPaidAction,
  markDebtPaidAction,
  revealIbanAction,
} from "@/features/sortie/actions/debt-actions";

type PersonRef = { id: string; anonName: string | null; userName: string | null };
type PaymentMethod = {
  id: string;
  type: "iban" | "lydia" | "revolut" | "wero";
  valuePreview: string;
  displayLabel: string | null;
};

type Props = {
  shortId: string;
  debtId: string;
  amountCents: number;
  status: "pending" | "declared_paid" | "confirmed";
  other: PersonRef;
  view: "debtor" | "creditor";
  methods?: PaymentMethod[];
};

const TYPE_LABEL: Record<PaymentMethod["type"], string> = {
  iban: "IBAN",
  lydia: "Lydia",
  revolut: "Revolut",
  wero: "Wero",
};

function personName(p: PersonRef): string {
  return p.userName ?? p.anonName ?? "Quelqu'un";
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function DebtRow({
  shortId,
  debtId,
  amountCents,
  status,
  other,
  view,
  methods = [],
}: Props) {
  const statusLabel =
    status === "confirmed"
      ? "Réglé"
      : status === "declared_paid"
        ? "En attente de confirmation"
        : "À régler";

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-surface-400 bg-surface-50 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-serif text-lg text-ink-700">{personName(other)}</span>
          <span className="text-xs uppercase tracking-[0.06em] text-hot-600">{statusLabel}</span>
        </div>
        <span className="font-serif text-2xl text-ink-700">{formatCents(amountCents)}</span>
      </div>

      {view === "debtor" && status !== "confirmed" && (
        <>
          {methods.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {methods.map((m) => (
                <MethodRow key={m.id} shortId={shortId} debtId={debtId} method={m} />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-400">
              {personName(other)} n&rsquo;a pas encore renseigné de moyen de paiement.
            </p>
          )}
          {status === "pending" && <MarkPaidButton shortId={shortId} debtId={debtId} />}
          {status === "declared_paid" && (
            <p className="text-xs text-ink-400">
              Tu as indiqué avoir réglé — en attente de sa confirmation.
            </p>
          )}
        </>
      )}

      {view === "creditor" && status !== "confirmed" && (
        <>
          {status === "pending" && (
            <p className="text-xs text-ink-400">En attente que {personName(other)} règle.</p>
          )}
          {status === "declared_paid" && <ConfirmPaidButton shortId={shortId} debtId={debtId} />}
        </>
      )}
    </li>
  );
}

function MarkPaidButton({ shortId, debtId }: { shortId: string; debtId: string }) {
  const [, formAction, pending] = useActionState<FormActionState, FormData>(
    markDebtPaidAction,
    {} as FormActionState
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="shortId" value={shortId} />
      <input type="hidden" name="debtId" value={debtId} />
      <Button type="submit" size="sm" disabled={pending} className="w-full">
        {pending ? "…" : "J'ai payé"}
      </Button>
    </form>
  );
}

function ConfirmPaidButton({ shortId, debtId }: { shortId: string; debtId: string }) {
  const [, formAction, pending] = useActionState<FormActionState, FormData>(
    confirmDebtPaidAction,
    {} as FormActionState
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="shortId" value={shortId} />
      <input type="hidden" name="debtId" value={debtId} />
      <Button type="submit" size="sm" disabled={pending} className="w-full">
        {pending ? "…" : "OK, j'ai bien reçu"}
      </Button>
    </form>
  );
}

function MethodRow({
  shortId,
  debtId,
  method,
}: {
  shortId: string;
  debtId: string;
  method: PaymentMethod;
}) {
  const [isPending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setError(null);
    startTransition(async () => {
      const result = await revealIbanAction({ shortId, methodId: method.id, debtId });
      if (result.ok) {
        setRevealed(result.value);
        // Auto-hide after 30s so the raw value doesn't linger in the DOM.
        window.setTimeout(() => setRevealed(null), 30_000);
      } else {
        setError(result.message);
      }
    });
  }

  async function copy() {
    if (!revealed) {
      return;
    }
    try {
      await navigator.clipboard.writeText(revealed);
    } catch {
      window.prompt("Copie :", revealed);
    }
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2">
      <div className="flex flex-col">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-hot-600">
          {TYPE_LABEL[method.type]}
          {method.displayLabel ? ` · ${method.displayLabel}` : ""}
        </span>
        <span className="font-mono text-sm text-ink-700">{revealed ?? method.valuePreview}</span>
        {error && <span className="text-xs text-erreur-700">{error}</span>}
      </div>
      {revealed ? (
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-full border border-surface-400 px-2.5 py-1 text-xs text-ink-500 hover:border-hot-500 hover:text-acid-700"
          aria-label="Copier"
        >
          <Copy size={12} /> Copier
        </button>
      ) : (
        <button
          type="button"
          onClick={reveal}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-full border border-surface-400 px-2.5 py-1 text-xs text-ink-500 hover:border-hot-500 hover:text-acid-700 disabled:opacity-40"
        >
          <Eye size={12} /> Afficher
        </button>
      )}
    </li>
  );
}
