"use client";

import { useActionState, useState } from "react";
import { swapPurchaserAction } from "@/features/sortie/actions/admin-debt-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Candidate = {
  participantId: string;
  name: string;
  isBuyer: boolean;
};

type Props = {
  shortId: string;
  currentBuyerName: string;
  candidates: Candidate[];
  locked: boolean;
  lockReason?: string;
};

export function SwapPurchaserForm({
  shortId,
  currentBuyerName,
  candidates,
  locked,
  lockReason,
}: Props) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    swapPurchaserAction,
    {} as FormActionState
  );
  const eligible = candidates.filter((c) => !c.isBuyer);
  const [target, setTarget] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!target) {
      e.preventDefault();
      return;
    }
    const name = eligible.find((c) => c.participantId === target)?.name ?? "cette personne";
    if (
      !window.confirm(
        `Marquer ${name} comme payeur ? Les dettes existantes seront recalculées (et ${currentBuyerName} deviendra débiteur de sa propre allocation).`
      )
    ) {
      e.preventDefault();
    }
  }

  if (locked) {
    return (
      <p className="text-xs text-amber-700">
        {lockReason ?? "Bascule du payeur bloquée — réinitialise d'abord les statuts de dette."}
      </p>
    );
  }

  if (eligible.length === 0) {
    return (
      <p className="text-xs text-ink-400">
        Aucun autre participant n&rsquo;a d&rsquo;allocation sur cet achat.
      </p>
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="shortId" value={shortId} />
      <select
        name="newPurchaserParticipantId"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="h-9 rounded-md border border-surface-400 bg-surface-50 px-2 text-sm text-ink-700"
      >
        <option value="">Choisir un payeur…</option>
        {eligible.map((c) => (
          <option key={c.participantId} value={c.participantId}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || !target}
        className="inline-flex h-9 items-center rounded-full bg-acid-600 px-4 text-xs font-bold uppercase tracking-[0.12em] text-surface-50 transition-colors hover:bg-acid-700 disabled:opacity-40 motion-safe:active:scale-95"
      >
        {pending ? "…" : "Basculer"}
      </button>
      {state.message && <p className="basis-full text-xs text-red-700">{state.message}</p>}
    </form>
  );
}
