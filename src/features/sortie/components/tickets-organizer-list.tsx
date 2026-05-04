"use client";

import { useActionState } from "react";
import { Trash2, Download, FileText, Users } from "lucide-react";
import { revokeTicketAction } from "@/features/sortie/actions/ticket-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import type { TicketView } from "@/features/sortie/queries/ticket-queries";
import { formatBytes } from "@/features/sortie/lib/format-bytes";

type Props = {
  shortId: string;
  tickets: TicketView[];
};

const SCOPE_LABEL: Record<TicketView["scope"], string> = {
  participant: "Nominatif",
  outing: "Groupé",
};

export function TicketsOrganizerList({ shortId, tickets }: Props) {
  if (tickets.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-surface-400 bg-surface-50 p-4 text-sm text-ink-500">
        Aucun billet n&rsquo;est encore enregistré pour cette sortie.
      </p>
    );
  }

  const grouped = tickets.filter((t) => t.scope === "outing");
  const personal = tickets.filter((t) => t.scope === "participant");

  return (
    <div className="flex flex-col gap-6">
      {grouped.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            ─ Billets groupés
          </h3>
          <ul className="flex flex-col divide-y divide-surface-400 rounded-md border border-surface-400 bg-surface-50">
            {grouped.map((t) => (
              <TicketRow key={t.id} shortId={shortId} ticket={t} />
            ))}
          </ul>
        </section>
      )}

      {personal.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            ─ Billets nominatifs
          </h3>
          <ul className="flex flex-col divide-y divide-surface-400 rounded-md border border-surface-400 bg-surface-50">
            {personal.map((t) => (
              <TicketRow key={t.id} shortId={shortId} ticket={t} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TicketRow({ shortId, ticket }: { shortId: string; ticket: TicketView }) {
  const isRevoked = ticket.revokedAt !== null;
  const Icon = ticket.scope === "outing" ? Users : FileText;

  return (
    <li className="flex items-center justify-between gap-3 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Icon
          size={18}
          strokeWidth={2}
          aria-hidden
          className={isRevoked ? "text-ink-300" : "text-hot-500"}
        />
        <div className="flex min-w-0 flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-hot-600">
            {SCOPE_LABEL[ticket.scope]}
            {ticket.scope === "participant" && ticket.participantDisplayName && (
              <span className="ml-2 text-ink-500">pour {ticket.participantDisplayName}</span>
            )}
          </span>
          <span className="truncate text-sm text-ink-700">
            {ticket.customLabel ?? ticket.originalFilename ?? `billet-${ticket.id.slice(0, 8)}`}
          </span>
          <span className="text-xs text-ink-400">
            {formatBytes(ticket.sizeBytes)} ·{" "}
            {isRevoked ? (
              <em className="text-erreur-700">révoqué</em>
            ) : (
              new Date(ticket.createdAt).toLocaleDateString("fr-FR")
            )}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!isRevoked && (
          <a
            href={`/api/sortie/tickets/${ticket.id}/download`}
            className="grid size-9 place-items-center rounded-full text-ink-400 transition-colors hover:bg-surface-200 hover:text-acid-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid-600"
            aria-label="Télécharger ce billet"
            target="_blank"
            rel="noopener"
          >
            <Download size={16} strokeWidth={2.2} />
          </a>
        )}
        {!isRevoked && <RevokeButton shortId={shortId} ticketId={ticket.id} />}
      </div>
    </li>
  );
}

function RevokeButton({ shortId, ticketId }: { shortId: string; ticketId: string }) {
  const [, formAction, pending] = useActionState<FormActionState, FormData>(
    revokeTicketAction,
    {} as FormActionState
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="shortId" value={shortId} />
      <input type="hidden" name="ticketId" value={ticketId} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Révoquer ce billet"
        className="grid size-9 place-items-center rounded-full text-ink-400 transition-colors hover:bg-surface-200 hover:text-erreur-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-erreur-700 disabled:opacity-40"
      >
        <Trash2 size={16} strokeWidth={2.2} />
      </button>
    </form>
  );
}
