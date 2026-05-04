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

type PersonGroup = {
  key: string;
  displayName: string;
  tickets: TicketView[];
};

/** Nom de fallback quand le participant a été supprimé / orphelin. */
const ANON_LABEL = "Sans nom";

/**
 * Regroupe les billets nominatifs par personne. La clé est `participantId`
 * quand il existe (cas normal), et un slug fallback du `displayName` sinon
 * — un participant supprimé garde son ancien nom dans le ticket mais perd
 * son id, on évite de tout mélanger sous une seule entrée "null".
 */
function groupByPerson(rows: TicketView[]): PersonGroup[] {
  const map = new Map<string, PersonGroup>();
  for (const t of rows) {
    const name = t.participantDisplayName ?? ANON_LABEL;
    const key = t.participantId ?? `orphan:${name}`;
    const existing = map.get(key);
    if (existing) {
      existing.tickets.push(t);
    } else {
      map.set(key, { key, displayName: name, tickets: [t] });
    }
  }
  // Ordre alpha sur le nom pour stabilité (sinon dépend de l'ordre SQL).
  return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
}

export function TicketsOrganizerList({ shortId, tickets }: Props) {
  if (tickets.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-surface-400 bg-surface-50 p-4 text-sm text-ink-500">
        Aucun billet n&rsquo;est encore enregistré pour cette sortie.
      </p>
    );
  }

  const groupedActive = tickets.filter((t) => t.scope === "outing" && t.revokedAt === null);
  const personalActive = tickets.filter((t) => t.scope === "participant" && t.revokedAt === null);
  const revoked = tickets.filter((t) => t.revokedAt !== null);

  const personGroups = groupByPerson(personalActive);

  return (
    <div className="flex flex-col gap-6">
      {groupedActive.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            ─ Billets groupés
          </h3>
          <ul className="flex flex-col divide-y divide-surface-400 rounded-md border border-surface-400 bg-surface-50">
            {groupedActive.map((t) => (
              <TicketRow key={t.id} shortId={shortId} ticket={t} />
            ))}
          </ul>
        </section>
      )}

      {personGroups.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            ─ Billets nominatifs
          </h3>
          <ul className="flex flex-col gap-3">
            {personGroups.map((g) => (
              <PersonGroupCard key={g.key} shortId={shortId} group={g} />
            ))}
          </ul>
        </section>
      )}

      {revoked.length > 0 && (
        <section>
          <details className="group/revoked rounded-md border border-surface-400 bg-surface-50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:text-ink-700">
              <span>
                ─ Révoqués <span className="text-ink-300">({revoked.length})</span>
              </span>
              <span
                aria-hidden
                className="text-ink-300 group-open/revoked:rotate-90 transition-transform"
              >
                ›
              </span>
            </summary>
            <ul className="flex flex-col divide-y divide-surface-400 border-t border-surface-400">
              {revoked.map((t) => (
                <TicketRow key={t.id} shortId={shortId} ticket={t} />
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}

function PersonGroupCard({ shortId, group }: { shortId: string; group: PersonGroup }) {
  const count = group.tickets.length;
  return (
    <li className="overflow-hidden rounded-md border border-surface-400 bg-surface-50">
      <header className="flex items-baseline justify-between gap-3 px-3 pt-3 pb-2">
        <span className="truncate font-serif text-base text-ink-700">{group.displayName}</span>
        <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
          {count} billet{count > 1 ? "s" : ""}
        </span>
      </header>
      <ul className="flex flex-col divide-y divide-surface-400 border-t border-surface-400">
        {group.tickets.map((t) => (
          <TicketRow key={t.id} shortId={shortId} ticket={t} compact />
        ))}
      </ul>
    </li>
  );
}

function TicketRow({
  shortId,
  ticket,
  compact = false,
}: {
  shortId: string;
  ticket: TicketView;
  /** Mode sous-row d'un PersonGroupCard : on cache l'eyebrow `Nominatif
   * pour X` (déjà dans le header du groupe) et l'icône (redondante). */
  compact?: boolean;
}) {
  const isRevoked = ticket.revokedAt !== null;
  const Icon = ticket.scope === "outing" ? Users : FileText;

  return (
    <li className="flex items-center justify-between gap-3 p-3">
      <div className="flex min-w-0 items-center gap-3">
        {!compact && (
          <Icon
            size={18}
            strokeWidth={2}
            aria-hidden
            className={isRevoked ? "text-ink-300" : "text-hot-500"}
          />
        )}
        <div className="flex min-w-0 flex-col">
          {!compact && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-hot-600">
              {ticket.scope === "outing" ? "Groupé" : "Nominatif"}
              {ticket.scope === "participant" && ticket.participantDisplayName && (
                <span className="ml-2 text-ink-500">pour {ticket.participantDisplayName}</span>
              )}
            </span>
          )}
          <span className="truncate text-sm text-ink-700">
            {ticket.customLabel ?? ticket.originalFilename ?? `billet-${ticket.id.slice(0, 8)}`}
          </span>
          <span className="text-xs text-ink-400">
            {formatBytes(ticket.sizeBytes)} ·{" "}
            {isRevoked ? (
              <em className="text-erreur-700">
                révoqué
                {ticket.revokedAt && ` · ${new Date(ticket.revokedAt).toLocaleDateString("fr-FR")}`}
              </em>
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
