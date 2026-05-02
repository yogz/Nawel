"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { PendingAction } from "@/features/sortie/lib/pending-actions";

type Props = {
  actions: PendingAction[];
};

/**
 * Boîte de réception déplacée du bandeau home vers une icône top-left.
 * Remplace `PendingActionsStrip` qui prenait toute la largeur sous le
 * hero — la nouvelle forme libère le 1er fold pour le hero perso et
 * regroupe les notifications dans un sheet ouvrable.
 *
 * Forme : icône Inbox + badge numérique (count d'actions en attente).
 * Quand 0 action, le composant ne render rien — pas de UI dead-state
 * pour les users sans nudges en cours.
 *
 * Le badge passe en hot pulsé quand au moins une action est en tone
 * "hot" (achat à faire, sondage à trancher, deadline dépassée). Sinon
 * acid statique. Aligné sur la sémantique tonal d'`Eyebrow`.
 */
export function PendingActionsInbox({ actions }: Props) {
  const [open, setOpen] = useState(false);

  if (actions.length === 0) {
    return null;
  }

  const hasHot = actions.some((a) => a.tone === "hot");
  const count = actions.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Boîte de réception (${count} action${count > 1 ? "s" : ""} en attente)`}
        className="group relative inline-flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-acid-600/55 transition-all duration-300 hover:ring-acid-600/80 motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hot-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50"
      >
        <Inbox
          size={20}
          strokeWidth={2.2}
          className="text-ink-700 transition-colors group-hover:text-acid-600"
        />
        <span
          aria-hidden
          className={cn(
            "absolute -right-0.5 -top-0.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-black leading-none tabular-nums ring-2 ring-surface-50",
            hasHot
              ? "sortie-deadline-halo bg-hot-500 text-surface-50"
              : "bg-acid-600 text-surface-50"
          )}
        >
          {count > 9 ? "9+" : count}
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-t-0 bg-surface-50 px-6 pb-10 pt-6"
        >
          <SheetHeader className="text-left">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
              ─ à toi de jouer ─
            </p>
            <SheetTitle className="font-display text-3xl font-black uppercase tracking-tight text-ink-700">
              Inbox
            </SheetTitle>
          </SheetHeader>

          <ul className="mt-6 flex flex-col">
            {actions.map((action, idx) => (
              <li key={action.outingId} className={cn("border-ink-100", idx > 0 && "border-t")}>
                <ActionRow action={action} onNavigate={() => setOpen(false)} />
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ActionRow({ action, onNavigate }: { action: PendingAction; onNavigate: () => void }) {
  const href = action.slug ? `/${action.slug}-${action.shortId}` : `/${action.shortId}`;
  const isHot = action.tone === "hot";

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-label={`${action.label} — ${action.title}`}
      className="group/row flex min-h-[56px] items-center gap-3 rounded-lg px-1 py-3 transition-all duration-300 hover:bg-surface-100 motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hot-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50"
    >
      <span
        aria-hidden
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          isHot
            ? "sortie-deadline-halo bg-hot-500 shadow-[0_0_10px_var(--sortie-hot)]"
            : "bg-acid-600 shadow-[0_0_8px_var(--sortie-acid)]"
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-mono text-[11px] uppercase tracking-[0.22em]",
            isHot ? "text-hot-500" : "text-acid-600"
          )}
        >
          {action.label}
        </p>
        <p className="mt-1 truncate text-[15px] font-semibold leading-tight text-ink-700">
          {action.title}
        </p>
      </div>
      <ArrowRight
        size={16}
        strokeWidth={2.4}
        aria-hidden="true"
        className="shrink-0 text-ink-400 transition-transform duration-300 group-hover/row:translate-x-0.5 group-hover/row:text-ink-700"
      />
    </Link>
  );
}
