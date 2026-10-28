"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import {
  addPaymentMethodAction,
  removePaymentMethodAction,
} from "@/features/sortie/actions/payment-method-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import type { PaymentMethodPreview } from "@/features/sortie/queries/payment-method-queries";
import {
  purgeLegacyPrefill,
  trackPaymentMethodAdded,
} from "@/features/sortie/lib/payment-method-prefill";

const TYPE_LABELS: Record<PaymentMethodPreview["type"], string> = {
  iban: "IBAN",
  lydia: "Lydia",
  revolut: "Revolut",
  wero: "Wero",
};

type Props = {
  shortId: string;
  methods: PaymentMethodPreview[];
};

export function PaymentMethodsManager({ shortId, methods }: Props) {
  // Plus de pré-remplissage en clair depuis le navigateur : on efface
  // l'ancien cache au passage.
  useEffect(() => {
    purgeLegacyPrefill();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {methods.length > 0 && (
        <ul className="flex flex-col divide-y divide-surface-400 rounded-md border border-surface-400 bg-surface-50">
          {methods.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-hot-600">
                  {TYPE_LABELS[m.type]}
                </span>
                <span className="font-mono text-sm text-ink-700">{m.valuePreview}</span>
                {m.displayLabel && <span className="text-xs text-ink-400">{m.displayLabel}</span>}
              </div>
              <RemoveButton shortId={shortId} methodId={m.id} />
            </li>
          ))}
        </ul>
      )}

      <AddMethodForm shortId={shortId} />
    </div>
  );
}

function AddMethodForm({ shortId }: { shortId: string }) {
  const [type, setType] = useState<PaymentMethodPreview["type"]>("iban");

  // Télémétrie seulement après succès serveur (pas d'IBAN invalide ou
  // rate-limité compté comme ajout).
  const wrappedAction = async (
    prev: FormActionState,
    formData: FormData
  ): Promise<FormActionState> => {
    const submittedType = formData.get("type") as PaymentMethodPreview["type"];
    const result = await addPaymentMethodAction(prev, formData);
    if (!result.errors && !result.message) {
      trackPaymentMethodAdded(submittedType);
    }
    return result;
  };

  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    wrappedAction,
    {} as FormActionState
  );
  const errors = state.errors ?? {};

  // Placeholders volontairement tronqués (ellipsis "…") pour qu'on ne
  // les confonde pas avec un IBAN/numéro déjà rempli — sinon un user
  // pressé peut croire que le champ est pré-saisi et soumettre la valeur
  // de démo. Les "…" en milieu/fin signalent visuellement le trou.
  const valueHint = type === "iban" ? "FR76 1234 5678 …………" : "+33 6 34 56 …";

  const valueLabel = type === "iban" ? "IBAN" : "Numéro de téléphone";

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-md border border-surface-400 bg-surface-50 p-4"
    >
      <input type="hidden" name="shortId" value={shortId} />
      <p className="text-sm text-ink-500">Ajouter un moyen</p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pm-type" className="text-[13px] font-medium text-ink-500">
          Type
        </Label>
        <select
          id="pm-type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as PaymentMethodPreview["type"])}
          className="h-11 rounded-md border border-surface-400 bg-surface-50 px-3 text-sm text-ink-700"
        >
          <option value="iban">IBAN</option>
          <option value="lydia">Lydia</option>
          <option value="revolut">Revolut</option>
          <option value="wero">Wero</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pm-value" className="text-[13px] font-medium text-ink-500">
          {valueLabel}
        </Label>
        <Input
          id="pm-value"
          name="value"
          type={type === "iban" ? "text" : "tel"}
          required
          placeholder={valueHint}
          autoComplete="off"
          spellCheck={false}
        />
        {errors.value?.[0] && <p className="text-xs text-erreur-700">{errors.value[0]}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pm-label" className="text-[13px] font-medium text-ink-500">
          Libellé <span className="text-ink-300">(facultatif)</span>
        </Label>
        <Input
          id="pm-label"
          name="displayLabel"
          type="text"
          maxLength={100}
          placeholder="Lydia principal"
        />
      </div>

      {state.message && (
        <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
          {state.message}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}

function RemoveButton({ shortId, methodId }: { shortId: string; methodId: string }) {
  const [, formAction, pending] = useActionState<FormActionState, FormData>(
    removePaymentMethodAction,
    {} as FormActionState
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="shortId" value={shortId} />
      <input type="hidden" name="methodId" value={methodId} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Supprimer ce moyen de paiement"
        className="grid size-9 place-items-center rounded-full text-ink-400 transition-colors hover:bg-surface-200 hover:text-erreur-700 disabled:opacity-40"
      >
        <Trash2 size={16} />
      </button>
    </form>
  );
}
