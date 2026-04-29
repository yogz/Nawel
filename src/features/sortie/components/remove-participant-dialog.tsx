"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { removeParticipantAction } from "@/features/sortie/actions/participant-actions";

type Props = {
  shortId: string;
  participantId: string;
  /** Nom affiché dans la confirmation pour éviter les retraits par
   * accident sur une longue liste de participants. */
  displayName: string;
};

/**
 * Owner-only — retire un participant de la sortie via
 * `removeParticipantAction`. Pattern aligné sur `RemoveRsvpButton` :
 * petit trigger + sheet de confirmation, action serveur, refresh. La
 * vérification d'identité (créateur seulement) est faite côté serveur.
 */
export function RemoveParticipantButton({ shortId, participantId, displayName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("shortId", shortId);
      fd.set("participantId", participantId);
      const result = await removeParticipantAction({}, fd);
      if (result?.message) {
        setError(result.message);
        return;
      }
      setOpen(false);
      setError(null);
      router.refresh();
    });
  }

  function handleClose() {
    if (pending) {
      return;
    }
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Retirer ${displayName}`}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive focus-visible:outline-none"
      >
        <Trash2 size={14} strokeWidth={2.2} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={handleClose}
              className="fixed inset-y-0 left-1/2 z-40 w-full max-w-[520px] -translate-x-1/2 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="remove-participant-title"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl bg-surface-100 p-6 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-ink-700/10"
            >
              <h3
                id="remove-participant-title"
                className="mb-2 font-serif text-lg leading-tight text-ink-700"
              >
                Retirer {displayName}&nbsp;?
              </h3>
              <p className="mb-6 text-sm text-ink-500">
                Sa réponse disparaîtra des compteurs. Iel pourra répondre à nouveau via le lien.
              </p>
              {error && (
                <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={pending}
                  className="inline-flex h-11 items-center justify-center rounded-md border border-ink-200 bg-surface-50 px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-surface-200 disabled:opacity-50"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={pending}
                  className="inline-flex h-11 items-center justify-center rounded-md bg-destructive px-4 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                >
                  {pending ? "Suppression…" : "Retirer"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
