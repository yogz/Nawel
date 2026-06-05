"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { editPurchaseAction } from "@/features/sortie/actions/purchase-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import { formatCents } from "@/features/sortie/lib/format";
import {
  EuroInput,
  centsToEuroInput,
  parseEuros,
  type PricingMode,
} from "@/features/sortie/components/purchase-form-shared";

export type NominalRowView = {
  allocationId: string;
  displayName: string;
  isChild: boolean;
  gifted: boolean;
  priceCents: number;
};

type Props = {
  shortId: string;
  mode: PricingMode;
  // unique
  uniquePriceCents?: number;
  placesCount?: number;
  // category
  adultPriceCents?: number;
  childPriceCents?: number;
  adultCount?: number;
  childCount?: number;
  // nominal
  nominalRows?: NominalRowView[];
};

export function EditPurchaseForm(props: Props) {
  const { shortId, mode } = props;
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    editPurchaseAction,
    {} as FormActionState
  );

  const [uniquePrice, setUniquePrice] = useState(
    mode === "unique" ? centsToEuroInput(props.uniquePriceCents ?? 0) : ""
  );
  const [adultPrice, setAdultPrice] = useState(
    mode === "category" ? centsToEuroInput(props.adultPriceCents ?? 0) : ""
  );
  const [childPrice, setChildPrice] = useState(
    mode === "category" ? centsToEuroInput(props.childPriceCents ?? 0) : ""
  );
  const [nominalByAlloc, setNominalByAlloc] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (props.nominalRows ?? []).map((r) => [r.allocationId, centsToEuroInput(r.priceCents)])
    )
  );

  const errors = state.errors ?? {};

  // Champ caché nominal : une entrée { allocationId, priceCents } par place.
  // Les places offertes comptent 0 € au recalcul quel que soit leur prix, mais
  // on les renvoie quand même pour que l'ensemble couvre toutes les allocations
  // (le serveur exige une couverture exacte).
  const allocationPricesJson = useMemo(() => {
    if (mode !== "nominal") {
      return "";
    }
    return JSON.stringify(
      (props.nominalRows ?? []).map((r) => ({
        allocationId: r.allocationId,
        priceCents: parseEuros(nominalByAlloc[r.allocationId] ?? ""),
      }))
    );
  }, [mode, props.nominalRows, nominalByAlloc]);

  const totalCents = useMemo(() => {
    if (mode === "unique") {
      return parseEuros(uniquePrice) * (props.placesCount ?? 0);
    }
    if (mode === "category") {
      return (
        parseEuros(adultPrice) * (props.adultCount ?? 0) +
        parseEuros(childPrice) * (props.childCount ?? 0)
      );
    }
    return (props.nominalRows ?? []).reduce(
      (acc, r) => acc + (r.gifted ? 0 : parseEuros(nominalByAlloc[r.allocationId] ?? "")),
      0
    );
  }, [
    mode,
    uniquePrice,
    adultPrice,
    childPrice,
    nominalByAlloc,
    props.placesCount,
    props.adultCount,
    props.childCount,
    props.nominalRows,
  ]);

  const canSubmit =
    (mode === "unique" && uniquePrice.trim() !== "") ||
    (mode === "category" && adultPrice.trim() !== "" && childPrice.trim() !== "") ||
    (mode === "nominal" &&
      (props.nominalRows ?? []).every(
        (r) => r.gifted || (nominalByAlloc[r.allocationId] ?? "").trim() !== ""
      ));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="shortId" value={shortId} />
      <input type="hidden" name="pricingMode" value={mode} />
      {mode === "nominal" && (
        <input type="hidden" name="allocationPrices" value={allocationPricesJson} />
      )}

      {mode === "unique" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit-price" className="text-[13px] font-medium text-ink-500">
            Prix par place
          </Label>
          <EuroInput id="unit-price" value={uniquePrice} onChange={setUniquePrice} />
          <input type="hidden" name="uniquePriceCents" value={parseEuros(uniquePrice)} />
          {errors.uniquePriceCents?.[0] && (
            <p className="text-xs text-erreur-700">{errors.uniquePriceCents[0]}</p>
          )}
        </div>
      )}

      {mode === "category" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adult-price" className="text-[13px] font-medium text-ink-500">
              Adulte
            </Label>
            <EuroInput id="adult-price" value={adultPrice} onChange={setAdultPrice} />
            <input type="hidden" name="adultPriceCents" value={parseEuros(adultPrice)} />
            {errors.adultPriceCents?.[0] && (
              <p className="text-xs text-erreur-700">{errors.adultPriceCents[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="child-price" className="text-[13px] font-medium text-ink-500">
              Enfant
            </Label>
            <EuroInput id="child-price" value={childPrice} onChange={setChildPrice} />
            <input type="hidden" name="childPriceCents" value={parseEuros(childPrice)} />
            {errors.childPriceCents?.[0] && (
              <p className="text-xs text-erreur-700">{errors.childPriceCents[0]}</p>
            )}
          </div>
        </div>
      )}

      {mode === "nominal" && (
        <div className="flex flex-col gap-2 rounded-lg bg-surface-50 p-4">
          <p className="text-sm text-ink-500">Un tarif par place</p>
          <ul className="flex flex-col divide-y divide-surface-400">
            {(props.nominalRows ?? []).map((r) => (
              <li key={r.allocationId} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-ink-600">
                  {r.displayName}
                  {r.isChild && <span className="ml-2 text-xs text-ink-400">(enfant)</span>}
                </span>
                {r.gifted ? (
                  <span className="text-xs text-ink-400">offerte (0 €)</span>
                ) : (
                  <EuroInput
                    value={nominalByAlloc[r.allocationId] ?? ""}
                    onChange={(next) =>
                      setNominalByAlloc((prev) => ({ ...prev, [r.allocationId]: next }))
                    }
                    className="w-28"
                  />
                )}
              </li>
            ))}
          </ul>
          {errors.allocationPrices?.[0] && (
            <p className="text-xs text-erreur-700">{errors.allocationPrices[0]}</p>
          )}
        </div>
      )}

      <div className="rounded-lg border border-hot-500/30 bg-hot-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-hot-600">
          Nouveau total
        </p>
        <p className="font-serif text-4xl text-ink-700">{formatCents(totalCents)}</p>
        <p className="mt-1 text-xs text-ink-400">
          Les dettes des participants seront recalculées en conséquence.
        </p>
      </div>

      {state.message && (
        <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
          {state.message}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" size="lg" disabled={pending || !canSubmit}>
          {pending ? "Enregistrement…" : "Mettre à jour le prix"}
        </Button>
      </div>
    </form>
  );
}
