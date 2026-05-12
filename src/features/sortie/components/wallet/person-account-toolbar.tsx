"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  markAllDebtsPaidAction,
  remindAllDebtsAction,
  settleNetAction,
  type BulkActionResult,
} from "@/features/sortie/actions/wallet-bulk-actions";
import { formatCents, personName, type PersonRef } from "@/features/sortie/lib/format";

type BaseProps = {
  /** PersonRef du contact, doit avoir `userId` non-null (sinon le toolbar
   * n'est pas affiché — fallback per-debt côté page). */
  person: PersonRef;
  /** Somme brute des dettes pending que le caller doit à `person` (≥ 0). */
  youOweCents: number;
  /** Somme brute des crédits pending que `person` doit au caller (≥ 0). */
  owedToYouCents: number;
  /** Net signé du POV caller : positif = on lui doit, négatif = il doit. */
  netCents: number;
};

const RESULT_MESSAGES: Record<Exclude<BulkActionResult, { ok: true }>["code"], string> = {
  unauthorized: "Connecte-toi pour faire ça.",
  rate_limited: "Une seconde — réessaie dans un instant.",
  cooldown: "Déjà relancé récemment. Réessaie plus tard.",
  invalid: "Action invalide.",
  nothing_todo: "Rien à faire ici.",
  error: "Une erreur est survenue.",
};

function useBulkRunner() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  function run(
    action: (input: { otherUserId: string }) => Promise<BulkActionResult>,
    otherUserId: string,
    successMessage: string,
    confirmText?: string
  ) {
    if (confirmText && !window.confirm(confirmText)) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await action({ otherUserId });
      if (result.ok) {
        setMessage(successMessage);
        router.refresh();
      } else {
        setMessage(RESULT_MESSAGES[result.code]);
      }
    });
  }
  return { pending, message, run };
}

/**
 * Bouton « Relancer » placé inline près du nom de la contrepartie.
 * S'affiche dès qu'au moins un crédit pending existe (peu importe le net).
 */
export function PersonAccountReminder({ person, owedToYouCents }: BaseProps) {
  const { pending, message, run } = useBulkRunner();
  if (!person.userId || owedToYouCents === 0) {
    return null;
  }
  const otherUserId = person.userId;
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        className="h-7 px-2 py-0 text-[12px]"
        onClick={() =>
          run(remindAllDebtsAction, otherUserId, `Mail récap envoyé à ${personName(person)}.`)
        }
      >
        Relancer
      </Button>
      {message && (
        <span className="text-[11px] text-ink-500" role="status" aria-live="polite">
          {message}
        </span>
      )}
    </span>
  );
}

/**
 * Bouton(s) de paiement placés sous la liste des dettes :
 * - flux mono-dir débiteur → « J'ai tout payé »
 * - flux croisés → « Solder » (compensation bilatérale)
 */
export function PersonAccountPayment({ person, youOweCents, owedToYouCents, netCents }: BaseProps) {
  const { pending, message, run } = useBulkRunner();
  if (!person.userId || youOweCents === 0) {
    return null;
  }
  const otherUserId = person.userId;
  const hasBothSides = owedToYouCents > 0;
  const absNet = Math.abs(netCents);

  let button: React.ReactNode;
  if (!hasBothSides) {
    button = (
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          run(
            markAllDebtsPaidAction,
            otherUserId,
            `${personName(person)} sera notifié·e du règlement.`
          )
        }
      >
        J&rsquo;ai tout payé ({formatCents(youOweCents)})
      </Button>
    );
  } else if (netCents === 0) {
    button = (
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          run(
            settleNetAction,
            otherUserId,
            `Compte soldé avec ${personName(person)}.`,
            `Marquer tout le compte avec ${personName(person)} comme réglé ? ` +
              `Tu déclares avoir payé ${formatCents(youOweCents)} et confirmes avoir reçu ${formatCents(owedToYouCents)}. ` +
              `Cette action est tracée et un mail récap est envoyé.`
          )
        }
      >
        Solder à zéro
      </Button>
    );
  } else if (netCents < 0) {
    button = (
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          run(
            settleNetAction,
            otherUserId,
            `Compte soldé. ${personName(person)} a été prévenu·e.`,
            `Solder le compte en versant le net de ${formatCents(absNet)} à ${personName(person)} ? ` +
              `Tu déclares avoir payé ${formatCents(youOweCents)} et confirmes avoir reçu ${formatCents(owedToYouCents)} via compensation. ` +
              `Cette action est tracée et un mail récap est envoyé.`
          )
        }
      >
        Solder (verser {formatCents(absNet)})
      </Button>
    );
  } else {
    // Net en ma faveur : il/elle doit plus. C'est à elle/lui de payer,
    // donc pas de bouton de paiement côté caller. Le « Relancer » dans le
    // header header couvre l'action utile.
    return null;
  }

  return (
    <div className="flex flex-col gap-2 border-t border-surface-400/40 pt-3">
      <div className="flex flex-wrap items-center gap-2">{button}</div>
      {message && (
        <p className="text-[12px] text-ink-500" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
