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

type Props = {
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

export function PersonAccountToolbar({ person, youOweCents, owedToYouCents, netCents }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!person.userId) {
    return null;
  }
  const otherUserId = person.userId;

  // Aucun pending dans aucun sens → toolbar sans boutons (les rows
  // declared_paid gardent leur bouton « OK reçu » individuel).
  if (youOweCents === 0 && owedToYouCents === 0) {
    return null;
  }

  function run(
    action: (input: { otherUserId: string }) => Promise<BulkActionResult>,
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

  const hasBothSides = youOweCents > 0 && owedToYouCents > 0;
  const youOweOnly = youOweCents > 0 && owedToYouCents === 0;
  const owedToYouOnly = youOweCents === 0 && owedToYouCents > 0;

  const buttons: React.ReactNode[] = [];

  if (owedToYouOnly) {
    buttons.push(
      <Button
        key="remind"
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run(remindAllDebtsAction, `Mail récap envoyé à ${personName(person)}.`)}
      >
        Relancer ({formatCents(owedToYouCents)})
      </Button>
    );
  }

  if (youOweOnly) {
    buttons.push(
      <Button
        key="paid"
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          run(markAllDebtsPaidAction, `${personName(person)} sera notifié·e du règlement.`)
        }
      >
        J&rsquo;ai tout payé ({formatCents(youOweCents)})
      </Button>
    );
  }

  if (hasBothSides) {
    if (netCents === 0) {
      buttons.push(
        <Button
          key="settle-zero"
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(
              settleNetAction,
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
      // Je dois le net.
      const absNet = Math.abs(netCents);
      buttons.push(
        <Button
          key="settle-pay"
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(
              settleNetAction,
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
      // Il/elle doit le net : on relance pour qu'il/elle verse.
      buttons.push(
        <Button
          key="remind-net"
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(remindAllDebtsAction, `Mail récap envoyé à ${personName(person)}.`)}
        >
          Relancer (solde {formatCents(netCents)})
        </Button>
      );
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-surface-400/40 pt-3">
      <div className="flex flex-wrap items-center gap-2">{buttons}</div>
      {message && (
        <p className="text-[12px] text-ink-500" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
