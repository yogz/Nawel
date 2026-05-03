import { Download, FileText, Users } from "lucide-react";
import type { TicketView } from "@/features/sortie/queries/ticket-queries";

type Props = {
  tickets: TicketView[];
};

const SCOPE_LABEL: Record<TicketView["scope"], string> = {
  participant: "Mon billet",
  outing: "Billet groupé",
};

function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n} o`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(0)} Ko`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

export function TicketsParticipantList({ tickets }: Props) {
  if (tickets.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-surface-400 bg-surface-50 p-4 text-sm text-ink-500">
        Aucun billet n&rsquo;est disponible pour le moment. L&rsquo;organisateur t&rsquo;enverra un
        email dès qu&rsquo;un billet sera prêt.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-surface-400 rounded-md border border-surface-400 bg-surface-50">
      {tickets.map((t) => {
        const Icon = t.scope === "outing" ? Users : FileText;
        return (
          <li key={t.id} className="flex items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <Icon size={18} strokeWidth={2} aria-hidden className="text-hot-500" />
              <div className="flex min-w-0 flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-hot-600">
                  {SCOPE_LABEL[t.scope]}
                </span>
                <span className="truncate text-sm text-ink-700">
                  {t.originalFilename ?? `billet-${t.id.slice(0, 8)}`}
                </span>
                <span className="text-xs text-ink-400">{formatBytes(t.sizeBytes)}</span>
              </div>
            </div>
            <a
              href={`/api/sortie/tickets/${t.id}/download`}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-acid-600 bg-acid-600/10 px-4 text-sm font-medium text-acid-700 transition-colors hover:bg-acid-600/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid-600"
              target="_blank"
              rel="noopener"
            >
              <Download size={14} strokeWidth={2.2} aria-hidden />
              Télécharger
            </a>
          </li>
        );
      })}
    </ul>
  );
}
