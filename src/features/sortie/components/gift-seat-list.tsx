"use client";

import { useActionState } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import { giftAllocationAction } from "@/features/sortie/actions/purchase-actions";
import type { CreditorSeat } from "@/features/sortie/queries/debt-queries";
import { ActionStatus } from "./action-status";

type Props = {
  shortId: string;
  seats: CreditorSeat[];
  /** Verrou sortie-wide : un paiement déjà déclaré gèle les offres (côté
   * serveur aussi — ici on désactive juste le bouton pour ne pas mentir). */
  locked: boolean;
};

/**
 * Sous-panneau « Offrir » rendu sous une ligne « Ce qu'on te doit » : liste les
 * places du débiteur avec, par place, un bouton « Offrir » (ou un badge
 * « Offerte » si c'est déjà fait). Offrir une place sort son coût de la dette.
 */
export function GiftSeatList({ shortId, seats, locked }: Props) {
  if (seats.length === 0) {
    return null;
  }
  return (
    <ul className="flex flex-col gap-1 border-t border-surface-400 pt-2">
      {seats.map((s) => (
        <GiftSeatRow key={s.allocationId} shortId={shortId} seat={s} locked={locked} />
      ))}
    </ul>
  );
}

function GiftSeatRow({
  shortId,
  seat,
  locked,
}: {
  shortId: string;
  seat: CreditorSeat;
  locked: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    giftAllocationAction,
    {} as FormActionState
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        `Offrir « ${seat.label} » ? Cette personne n'aura plus rien à régler pour cette place — c'est définitif.`
      )
    ) {
      e.preventDefault();
    }
  }

  return (
    <li className="flex min-h-11 items-center justify-between gap-2 text-[13px]">
      <span className="min-w-0 truncate text-ink-500">{seat.label}</span>
      {seat.giftedAt ? (
        <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">
          <Gift size={12} aria-hidden /> Offerte
        </span>
      ) : locked ? (
        <span className="shrink-0 text-[11px] text-ink-400" aria-hidden>
          —
        </span>
      ) : (
        <form action={formAction} onSubmit={handleSubmit} className="shrink-0">
          <input type="hidden" name="shortId" value={shortId} />
          <input type="hidden" name="allocationId" value={seat.allocationId} />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={pending}
            className="min-h-11 gap-1.5 whitespace-nowrap px-2 py-2 text-[13px] text-ink-500 hover:text-acid-700 sm:px-3"
          >
            <Gift size={14} aria-hidden /> {pending ? "…" : "Offrir"}
          </Button>
          <ActionStatus message={state.message} />
        </form>
      )}
    </li>
  );
}
