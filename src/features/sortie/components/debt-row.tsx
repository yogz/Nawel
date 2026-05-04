"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Copy, Eye, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import {
  confirmDebtPaidAction,
  markDebtPaidAction,
  remindDebtAction,
  revealIbanAction,
} from "@/features/sortie/actions/debt-actions";
import { buildWaHref } from "@/features/sortie/lib/whatsapp-share";

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
  /** Titre de la sortie — utilisé par le bouton WhatsApp pour
   * personnaliser le message de relance. Optionnel : seule la branche
   * `view === "creditor" && status === "pending"` le consomme. */
  outingTitle?: string;
  /** Quand fourni, affiche un eyebrow cliquable au-dessus du nom
   * pointant vers la sortie. Utilisé par la page globale `/moi/argent`
   * où la même row peut concerner n'importe quelle sortie. */
  outingHref?: string;
  /** Mode sous-ligne : la row vit à l'intérieur d'un wrapper
   * `PersonDebtGroup` qui affiche déjà le nom et le total. On enlève
   * donc le chrome de carte (border/bg/p-4) et le bloc nom-de-personne,
   * et on laisse l'eyebrow de sortie servir de désambiguïsateur. */
  compact?: boolean;
};

const TYPE_LABEL: Record<PaymentMethod["type"], string> = {
  iban: "IBAN",
  lydia: "Lydia",
  revolut: "Revolut",
  wero: "Wero",
};

// `À régler` (POV débiteur) ne se lit pas pareil quand on est créditeur
// — pour le créditeur c'est l'autre qui doit régler. Ce mapping garde
// chaque vue cohérente avec la perspective de l'utilisateur connecté.
const STATUS_LABEL: Record<"debtor" | "creditor", Record<Props["status"], string>> = {
  debtor: {
    pending: "À régler",
    declared_paid: "En attente de confirmation",
    confirmed: "Réglé",
  },
  creditor: {
    pending: "Pas encore reçu",
    declared_paid: "Confirmation à valider",
    confirmed: "Reçu",
  },
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
  outingTitle,
  outingHref,
  compact = false,
}: Props) {
  const statusLabel = STATUS_LABEL[view][status];
  // `confirmed` n'est plus actionnable : on désature la couleur pour ne
  // pas concurrencer un statut pending (qui lui appelle à l'action).
  const statusColor = status === "confirmed" ? "text-ink-400" : "text-hot-600";

  return (
    <li
      className={
        compact
          ? "flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
          : "flex flex-col gap-3 rounded-lg border border-surface-400 bg-surface-50 p-4"
      }
    >
      {outingHref && outingTitle && (
        <Link
          href={outingHref}
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 underline-offset-4 hover:text-acid-600 hover:underline"
        >
          ↳ {outingTitle}
        </Link>
      )}
      <div className="flex items-baseline justify-between gap-3">
        {compact ? (
          <span className={`text-xs uppercase tracking-[0.06em] ${statusColor}`}>
            {statusLabel}
          </span>
        ) : (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-serif text-lg text-ink-700">{personName(other)}</span>
            <span className={`text-xs uppercase tracking-[0.06em] ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        )}
        <span
          className={
            compact
              ? "shrink-0 font-serif text-xl tabular-nums text-ink-700"
              : "shrink-0 font-serif text-2xl tabular-nums text-ink-700"
          }
        >
          {formatCents(amountCents)}
        </span>
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
            <>
              <p className="text-xs text-ink-400">En attente que {personName(other)} règle.</p>
              <div className="flex flex-nowrap items-center justify-between gap-0.5 sm:flex-wrap sm:justify-start sm:gap-1">
                {outingTitle && (
                  <WhatsAppNudgeLink
                    shortId={shortId}
                    debtorName={personName(other)}
                    amountCents={amountCents}
                    outingTitle={outingTitle}
                  />
                )}
                <EmailNudgeButton shortId={shortId} debtId={debtId} />
                <CreditorMarkReceivedButton shortId={shortId} debtId={debtId} />
              </div>
            </>
          )}
          {status === "declared_paid" && <ConfirmPaidButton shortId={shortId} debtId={debtId} />}
        </>
      )}
    </li>
  );
}

function WhatsAppNudgeLink({
  shortId,
  debtorName,
  amountCents,
  outingTitle,
}: {
  shortId: string;
  debtorName: string;
  amountCents: number;
  outingTitle: string;
}) {
  // `window.location.origin` côté client : marche en preview, staging
  // et local sans hardcoder sortie.colist.fr (qui casserait les
  // déploiements non-prod). Fallback prod si jamais on est en SSR.
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://sortie.colist.fr";
  const link = `${origin}/${shortId}/dettes`;
  const message = `Salut ${debtorName} ! Tu peux régler les ${formatCents(amountCents)} pour ${outingTitle} quand tu peux ? ${link}`;
  return (
    <a
      href={buildWaHref(message)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-2 text-[13px] text-ink-500 transition-colors hover:text-acid-700 sm:px-3"
    >
      <MessageCircle size={14} aria-hidden /> WhatsApp
    </a>
  );
}

function EmailNudgeButton({ shortId, debtId }: { shortId: string; debtId: string }) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    remindDebtAction,
    {} as FormActionState
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="shortId" value={shortId} />
      <input type="hidden" name="debtId" value={debtId} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        disabled={pending}
        className="min-h-11 shrink-0 gap-1.5 whitespace-nowrap px-2 py-2 text-[13px] text-ink-500 hover:text-acid-700 sm:px-3"
        title={state.message ?? undefined}
      >
        <Mail size={14} aria-hidden /> {pending ? "…" : "Email"}
      </Button>
    </form>
  );
}

function CreditorMarkReceivedButton({ shortId, debtId }: { shortId: string; debtId: string }) {
  const [, formAction, pending] = useActionState<FormActionState, FormData>(
    confirmDebtPaidAction,
    {} as FormActionState
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="shortId" value={shortId} />
      <input type="hidden" name="debtId" value={debtId} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        disabled={pending}
        className="min-h-11 shrink-0 whitespace-nowrap px-2 py-2 text-[13px] text-ink-500 hover:text-acid-700 sm:self-start sm:px-3"
      >
        {pending ? "…" : "j'ai déjà reçu →"}
      </Button>
    </form>
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
