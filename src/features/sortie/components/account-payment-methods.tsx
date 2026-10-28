"use client";

import { useActionState, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addAccountPaymentMethodAction,
  removeAccountPaymentMethodAction,
  type AccountPaymentActionState,
} from "@/features/sortie/actions/account-payment-actions";
import type { PaymentMethodPreview } from "@/features/sortie/queries/payment-method-queries";
import { purgeLegacyPrefill } from "@/features/sortie/lib/payment-method-prefill";
import {
  MAX_ACCOUNT_METHODS,
  MAX_LABEL_LENGTH,
  PAYMENT_TYPE_LABEL,
} from "@/features/sortie/lib/account-payment/rules";

/**
 * Section « Tes moyens de paiement » de « Mon argent ». Ne reçoit que des
 * aperçus masqués : la valeur claire ne revient jamais au navigateur.
 * Cf. spec 2026-10-28-sortie-account-payment-methods-design.md §5 bis.
 */

export type AccountMethodView = {
  id: string;
  type: PaymentMethodPreview["type"];
  valuePreview: string;
  displayLabel: string | null;
  /** Ajouté mais pas encore confirmé par le lien e-mail. */
  pending: boolean;
};

type Props = {
  methods: AccountMethodView[];
  /** Compte connecté à l'e-mail vérifié. */
  canManage: boolean;
  /** Résultat du lien de confirmation (`?moyen=`), null sinon. */
  outcome: string | null;
};

const OUTCOME_MESSAGES: Record<string, string> = {
  confirme: "Moyen de paiement confirmé. Il sera joint à tes prochains achats.",
  expire: "Lien expiré. Ajoute ce moyen à nouveau pour recevoir un nouveau lien.",
  "autre-compte":
    "Ce lien a été envoyé à un autre compte. Connecte-toi avec celui-là pour le confirmer.",
  plein: "5 moyens maximum. Retire-en un pour en ajouter un autre.",
  invalide: "Lien invalide ou déjà utilisé.",
};

function removeLabel(m: AccountMethodView): string {
  const type = PAYMENT_TYPE_LABEL[m.type] ?? m.type;
  return `Retirer ${m.type === "iban" ? "l'" : "le "}${type} ${m.valuePreview}`;
}

export function AccountPaymentMethods({ methods, canManage, outcome }: Props) {
  // L'ancien pré-remplissage gardait l'IBAN en clair dans le navigateur.
  useEffect(() => {
    purgeLegacyPrefill();
  }, []);

  const [addState, addAction, adding] = useActionState<AccountPaymentActionState, FormData>(
    addAccountPaymentMethodAction,
    {}
  );
  const [removeState, removeAction, removing] = useActionState<AccountPaymentActionState, FormData>(
    removeAccountPaymentMethodAction,
    {}
  );
  const [formOpen, setFormOpen] = useState(false);

  const confirmedCount = methods.filter((m) => !m.pending).length;
  const isFull = confirmedCount >= MAX_ACCOUNT_METHODS;
  const showForm = canManage && !isFull && (methods.length === 0 || formOpen);
  const outcomeMessage = outcome ? OUTCOME_MESSAGES[outcome] : undefined;
  const notice = addState.notice ?? removeState.notice;
  const error = addState.message ?? removeState.message;

  return (
    <section id="moyens" className="mb-10 scroll-mt-6">
      <h2 className="mb-2 text-[24px] font-black tracking-[-0.025em] text-ink-700">
        Tes moyens de paiement
      </h2>
      <p className="mb-1 text-[15px] text-ink-500">
        Enregistre-les une fois : ils sont joints automatiquement au mail de chacun quand tu
        déclares un achat.
      </p>
      <p className="mb-4 text-[13px] text-ink-400">
        Masqués partout. En entier seulement pour qui te doit de l&apos;argent, à sa demande.
      </p>

      {outcomeMessage && (
        <p
          role="status"
          className="mb-4 rounded-md border border-acid-600/30 bg-acid-600/5 p-3 text-sm text-ink-700"
        >
          {outcomeMessage}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-md border border-acid-600/30 bg-acid-600/5 p-3 text-sm text-ink-700"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700"
        >
          {error}
        </p>
      )}

      {methods.length > 0 && (
        <ul className="mb-4 flex flex-col divide-y divide-surface-400 rounded-md border border-surface-400 bg-surface-50">
          {methods.map((m) => (
            <MethodRow
              key={m.id}
              method={m}
              canManage={canManage}
              removeAction={removeAction}
              removing={removing}
            />
          ))}
        </ul>
      )}

      {!canManage ? (
        <p className="text-sm text-ink-500">
          Confirme d&apos;abord ton adresse e-mail pour enregistrer un moyen de paiement.
        </p>
      ) : isFull ? (
        <p className="text-sm text-ink-500">
          5 moyens maximum. Retire-en un pour en ajouter un autre.
        </p>
      ) : showForm ? (
        <AddForm action={addAction} pending={adding} errors={addState.errors ?? {}} />
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex h-11 items-center rounded-full px-4 text-sm font-medium text-acid-700 motion-safe:transition-colors hover:bg-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          + Ajouter un autre moyen
        </button>
      )}
    </section>
  );
}

function MethodRow({
  method: m,
  canManage,
  removeAction,
  removing,
}: {
  method: AccountMethodView;
  canManage: boolean;
  removeAction: (formData: FormData) => void;
  removing: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-hot-600">
            {PAYMENT_TYPE_LABEL[m.type] ?? m.type}
          </span>
          <span className="font-mono text-sm text-ink-700">{m.valuePreview}</span>
          {m.displayLabel && <span className="text-xs text-ink-400">{m.displayLabel}</span>}
          {m.pending && <span className="text-xs text-hot-600">en attente de confirmation</span>}
        </div>
        {canManage && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={removeLabel(m)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-400 motion-safe:transition-colors hover:bg-surface-200 hover:text-erreur-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Trash2 size={16} aria-hidden />
          </button>
        )}
      </div>
      {confirming && (
        <form action={removeAction} className="flex flex-wrap items-center justify-end gap-2">
          <input type="hidden" name="methodId" value={m.id} />
          <Button type="submit" size="sm" disabled={removing}>
            Oui, retirer
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Annuler
          </Button>
        </form>
      )}
    </li>
  );
}

function AddForm({
  action,
  pending,
  errors,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  errors: Record<string, string[]>;
}) {
  const [type, setType] = useState<PaymentMethodPreview["type"]>("iban");
  // Placeholders tronqués (« … ») : jamais confondus avec une vraie valeur.
  const valueHint = type === "iban" ? "FR76 1234 5678 …………" : "+33 6 34 56 …";
  const valueLabel = type === "iban" ? "IBAN" : "Numéro de téléphone";

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-md border border-surface-400 bg-surface-50 p-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="acct-pm-type" className="text-[13px] font-medium text-ink-500">
          Type
        </Label>
        <select
          id="acct-pm-type"
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
        <Label htmlFor="acct-pm-value" className="text-[13px] font-medium text-ink-500">
          {valueLabel}
        </Label>
        <Input
          id="acct-pm-value"
          name="value"
          type={type === "iban" ? "text" : "tel"}
          required
          placeholder={valueHint}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={errors.value ? true : undefined}
        />
        {errors.value?.[0] && <p className="text-xs text-erreur-700">{errors.value[0]}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="acct-pm-label" className="text-[13px] font-medium text-ink-500">
          Libellé <span className="text-ink-300">(facultatif)</span>
        </Label>
        <Input
          id="acct-pm-label"
          name="displayLabel"
          type="text"
          maxLength={MAX_LABEL_LENGTH}
          placeholder="Compte joint"
          aria-describedby="acct-pm-label-help"
          aria-invalid={errors.displayLabel ? true : undefined}
        />
        <p id="acct-pm-label-help" className="text-xs text-ink-400">
          Visible par ceux qui te remboursent.
        </p>
        {errors.displayLabel?.[0] && (
          <p className="text-xs text-erreur-700">{errors.displayLabel[0]}</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}
