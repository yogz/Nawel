"use client";

import { useActionState, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { cancelOutingAction } from "@/features/sortie/actions/outing-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  shortId: string;
  outingTitle: string;
  /** Number of "yes" RSVPs — drives the modal copy. With attendees,
   * we spell out that emails will be sent so the creator can't
   * mis-tap their way into mailing 12 people. */
  confirmedCount: number;
};

/**
 * Creator-only "Annuler la sortie" button. Two-tier flow per UX review:
 *   - 0 confirmed RSVPs → simple confirm ("personne n'a encore dit oui")
 *   - N confirmed RSVPs → named consequence ("N personne(s) recevront un
 *     email"). Primary button is "Prévenir et annuler" — names the
 *     side effect instead of a generic "Confirmer".
 * The modal replaces the old `window.confirm` — same safety, but
 * matches the rest of the app visually and gives room for RSVP-aware
 * copy.
 */
export function CancelOutingButton({ shortId, outingTitle, confirmedCount }: Props) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    cancelOutingAction,
    {} as FormActionState
  );

  const hasAttendees = confirmedCount > 0;

  function handleConfirm() {
    formRef.current?.requestSubmit();
  }

  return (
    <div className="flex flex-col gap-2">
      <form ref={formRef} action={formAction} className="contents">
        <input type="hidden" name="shortId" value={shortId} />
      </form>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="self-start text-sm text-destructive underline-offset-4 hover:underline disabled:opacity-50"
      >
        {pending ? "Annulation…" : "Annuler la sortie"}
      </button>
      {state.message && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-encre-700/50"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-outing-title"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl bg-ivoire-50 p-6 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]"
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                  <AlertTriangle size={20} />
                </span>
                <div className="flex-1">
                  <h3
                    id="cancel-outing-title"
                    className="font-serif text-lg leading-tight text-encre-700"
                  >
                    Annuler « {outingTitle} » ?
                  </h3>
                </div>
              </div>
              <p className="mb-6 text-sm text-encre-500">
                {hasAttendees ? (
                  <>
                    <strong className="text-encre-700">
                      {confirmedCount} personne{confirmedCount > 1 ? "s" : ""}
                    </strong>{" "}
                    {confirmedCount > 1 ? "vont être prévenues" : "va être prévenue"} par email. Tu
                    ne pourras pas revenir en arrière.
                  </>
                ) : (
                  <>
                    Personne n&rsquo;a encore dit oui — aucun email ne partira. Tu ne pourras pas
                    revenir en arrière.
                  </>
                )}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="inline-flex h-11 items-center justify-center rounded-md border border-encre-200 bg-ivoire-50 px-4 text-sm font-semibold text-encre-700 transition-colors hover:bg-ivoire-100 disabled:opacity-50"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={pending}
                  className="inline-flex h-11 items-center justify-center rounded-md bg-destructive px-4 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                >
                  {hasAttendees ? "Prévenir et annuler" : "Annuler la sortie"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
