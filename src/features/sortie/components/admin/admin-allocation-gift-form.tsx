"use client";

import { useActionState } from "react";
import { Gift } from "lucide-react";
import {
  adminGiftAllocationAction,
  adminUngiftAllocationAction,
} from "@/features/sortie/actions/admin-debt-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  allocationId: string;
  gifted: boolean;
};

/**
 * Contrôle admin « Offrir / Annuler l'offre » sur une allocation. C'est la voie
 * par laquelle l'admin édite le statut `gifted` d'une dette — au niveau
 * allocation, via le recalcul partagé, jamais en forçant `debts.status`.
 */
export function AdminAllocationGiftForm({ allocationId, gifted }: Props) {
  const action = gifted ? adminUngiftAllocationAction : adminGiftAllocationAction;
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    action,
    {} as FormActionState
  );
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="allocationId" value={allocationId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-8 items-center gap-1 rounded-full border border-surface-400 px-3 text-xs text-ink-500 transition-colors hover:border-acid-600 hover:text-acid-700 disabled:opacity-40 motion-safe:active:scale-95"
      >
        <Gift size={12} strokeWidth={2.2} />
        {pending ? "…" : gifted ? "Annuler l'offre" : "Offrir"}
      </button>
      {state.message && <span className="text-xs text-red-700">{state.message}</span>}
    </form>
  );
}
