"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { declarePurchaseAction } from "@/features/sortie/actions/purchase-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  shortId: string;
  totalPlaces: number;
};

export function PurchaseForm({ shortId, totalPlaces }: Props) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    declarePurchaseAction,
    {} as FormActionState
  );
  const [price, setPrice] = useState("");
  const errors = state.errors ?? {};

  const priceCents = Math.round(Number(price.replace(",", ".")) * 100) || 0;
  const totalCents = priceCents * totalPlaces;
  const totalLabel = (totalCents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="shortId" value={shortId} />
      <input type="hidden" name="pricingMode" value="unique" />
      <input type="hidden" name="uniquePriceCents" value={priceCents} />

      <div className="rounded-lg bg-ivoire-50 p-4">
        <p className="text-sm text-encre-500">Places à couvrir</p>
        <p className="font-serif text-3xl text-encre-700">{totalPlaces}</p>
        <p className="mt-1 text-xs text-encre-400">Ça compte les +1 déjà renseignés.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit-price" className="text-[13px] font-medium text-encre-500">
          Prix par place
        </Label>
        <div className="relative">
          <Input
            id="unit-price"
            type="text"
            inputMode="decimal"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="45"
            className="pr-10"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-encre-400">
            €
          </span>
        </div>
        {errors.uniquePriceCents?.[0] && (
          <p className="text-xs text-erreur-700">{errors.uniquePriceCents[0]}</p>
        )}
      </div>

      <div className="rounded-lg border border-or-500/30 bg-or-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">Total</p>
        <p className="font-serif text-4xl text-encre-700">{totalLabel}</p>
        <p className="mt-1 text-xs text-encre-400">
          À répartir entre {totalPlaces} place{totalPlaces > 1 ? "s" : ""}.
        </p>
      </div>

      {state.message && (
        <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
          {state.message}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" size="lg" disabled={pending || priceCents <= 0}>
          {pending ? "Enregistrement…" : "Enregistrer l'achat"}
        </Button>
      </div>
    </form>
  );
}
