"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { declarePurchaseAction } from "@/features/sortie/actions/purchase-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Mode = "unique" | "category" | "nominal";

export type AllocationRowView = {
  participantId: string;
  displayName: string;
  isChild: boolean;
};

export type PurchaseView = {
  totalPlaces: number;
  adultCount: number;
  childCount: number;
  allocations: AllocationRowView[];
};

type Props = {
  shortId: string;
  normalView: PurchaseView;
  ghostView: PurchaseView;
  canGhost: boolean;
};

const MODE_COPY: Record<Mode, { title: string; hint: string }> = {
  unique: { title: "Prix unique", hint: "Tout le monde au même prix." },
  category: { title: "Par catégorie", hint: "Un prix adulte, un prix enfant." },
  nominal: { title: "Prix nominatif", hint: "Chacun son tarif (réduits, jeunes…)." },
};

function parseEuros(raw: string): number {
  const n = Number(raw.replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.round(n * 100);
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function PurchaseForm({ shortId, normalView, ghostView, canGhost }: Props) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    declarePurchaseAction,
    {} as FormActionState
  );
  const [mode, setMode] = useState<Mode>("unique");
  const [ghostBuyer, setGhostBuyer] = useState(false);
  const [uniquePrice, setUniquePrice] = useState("");
  const [adultPrice, setAdultPrice] = useState("");
  const [childPrice, setChildPrice] = useState("");
  // The nominal prices array is keyed by index, so we need to reset it when
  // the active view flips (ghost adds/removes buyer seats). `useMemo` on the
  // view plus the key below gets us a fresh state array without a useEffect.
  const view = ghostBuyer && canGhost ? ghostView : normalView;
  const { totalPlaces, adultCount, childCount, allocations } = view;
  const [nominalPricesByKey, setNominalPricesByKey] = useState<Record<string, string>>({});
  const nominalPrices = allocations.map(
    (_, i) => nominalPricesByKey[`${ghostBuyer ? "g" : "n"}:${i}`] ?? ""
  );

  const errors = state.errors ?? {};

  const totalCents = useMemo(() => {
    if (mode === "unique") {
      return parseEuros(uniquePrice) * totalPlaces;
    }
    if (mode === "category") {
      return parseEuros(adultPrice) * adultCount + parseEuros(childPrice) * childCount;
    }
    return nominalPrices.reduce((acc, v) => acc + parseEuros(v), 0);
  }, [
    mode,
    uniquePrice,
    adultPrice,
    childPrice,
    nominalPrices,
    totalPlaces,
    adultCount,
    childCount,
  ]);

  const canSubmit =
    totalPlaces > 0 &&
    ((mode === "unique" && parseEuros(uniquePrice) > 0) ||
      (mode === "category" && parseEuros(adultPrice) > 0) ||
      (mode === "nominal" && nominalPrices.every((v) => v.trim() !== "")));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="shortId" value={shortId} />
      <input type="hidden" name="pricingMode" value={mode} />
      <input type="hidden" name="ghostBuyer" value={ghostBuyer ? "on" : "false"} />

      {canGhost && (
        <label className="flex items-start gap-3 rounded-lg border border-ivoire-400 bg-ivoire-50 p-3 text-sm text-encre-500">
          <input
            type="checkbox"
            checked={ghostBuyer}
            onChange={(e) => setGhostBuyer(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-bordeaux-600"
          />
          <span className="flex flex-col">
            <span className="font-medium text-encre-700">
              Je n&rsquo;assiste pas, je prends juste les billets
            </span>
            <span className="text-xs text-encre-400">
              Tes places ne sont pas comptées. Tout le monde te doit sa part.
            </span>
          </span>
        </label>
      )}

      <div className="rounded-lg bg-ivoire-50 p-4">
        <p className="text-sm text-encre-500">Places à couvrir</p>
        <p className="font-serif text-3xl text-encre-700">{totalPlaces}</p>
        <p className="mt-1 text-xs text-encre-400">
          {adultCount} adulte{adultCount > 1 ? "s" : ""}
          {childCount > 0 && `, ${childCount} enfant${childCount > 1 ? "s" : ""}`}
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-[13px] font-medium text-encre-500">Tarif</legend>
        <div className="flex flex-col gap-2">
          {(Object.keys(MODE_COPY) as Mode[]).map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                mode === m
                  ? "border-or-500 bg-or-50"
                  : "border-ivoire-400 bg-ivoire-50 hover:border-or-500/50"
              }`}
            >
              <input
                type="radio"
                name="mode-picker"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="mt-1 h-4 w-4 accent-bordeaux-600"
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium text-encre-700">{MODE_COPY[m].title}</span>
                <span className="text-xs text-encre-400">{MODE_COPY[m].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {mode === "unique" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit-price" className="text-[13px] font-medium text-encre-500">
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
            <Label htmlFor="adult-price" className="text-[13px] font-medium text-encre-500">
              Adulte
            </Label>
            <EuroInput id="adult-price" value={adultPrice} onChange={setAdultPrice} />
            <input type="hidden" name="adultPriceCents" value={parseEuros(adultPrice)} />
            {errors.adultPriceCents?.[0] && (
              <p className="text-xs text-erreur-700">{errors.adultPriceCents[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="child-price" className="text-[13px] font-medium text-encre-500">
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
        <div className="flex flex-col gap-2 rounded-lg bg-ivoire-50 p-4">
          <p className="text-sm text-encre-500">Un tarif par place</p>
          <ul className="flex flex-col divide-y divide-ivoire-400">
            {allocations.map((a, i) => {
              const key = `${ghostBuyer ? "g" : "n"}:${i}`;
              return (
                <li
                  key={`${a.participantId}-${i}`}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-sm text-encre-600">
                    {a.displayName}
                    {a.isChild && <span className="ml-2 text-xs text-encre-400">(enfant)</span>}
                  </span>
                  <EuroInput
                    value={nominalPricesByKey[key] ?? ""}
                    onChange={(next) => setNominalPricesByKey((prev) => ({ ...prev, [key]: next }))}
                    className="w-28"
                  />
                  <input
                    type="hidden"
                    name="allocationPriceCents"
                    value={parseEuros(nominalPricesByKey[key] ?? "")}
                  />
                </li>
              );
            })}
          </ul>
          {errors.allocationPriceCents?.[0] && (
            <p className="text-xs text-erreur-700">{errors.allocationPriceCents[0]}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="proof-file" className="text-[13px] font-medium text-encre-500">
          Preuve d&rsquo;achat <span className="text-encre-300">(facultatif)</span>
        </Label>
        <input
          id="proof-file"
          name="proofFile"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="text-sm text-encre-600 file:mr-3 file:rounded-md file:border file:border-ivoire-400 file:bg-ivoire-50 file:px-3 file:py-2 file:text-sm file:text-encre-600 hover:file:border-or-500"
        />
        <p className="text-xs text-encre-400">PDF ou image, 5 Mo max.</p>
      </div>

      <div className="rounded-lg border border-or-500/30 bg-or-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">Total</p>
        <p className="font-serif text-4xl text-encre-700">{formatCents(totalCents)}</p>
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
        <Button type="submit" size="lg" disabled={pending || !canSubmit}>
          {pending ? "Enregistrement…" : "Enregistrer l'achat"}
        </Button>
      </div>
    </form>
  );
}

function EuroInput({
  id,
  value,
  onChange,
  className,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="pr-7"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-encre-400">
        €
      </span>
    </div>
  );
}
