"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { UserMinus } from "lucide-react";
import { removeRsvpAction } from "@/features/sortie/actions/participant-actions";

type Props = {
  shortId: string;
  /** Tailwind classes for the trigger button — lets callers match the
   * host card's type scale (tiny on profile cards, slightly larger on
   * the outing page). */
  triggerClassName?: string;
  /** Copy for the trigger. Defaults to "Retirer" to save horizontal
   * space on the profile card; page-level callers pass a fuller
   * "Retirer ma réponse". */
  triggerLabel?: string;
  iconSize?: number;
};

/**
 * "Retirer ma réponse" — confirm dialog + server action wrapper.
 * Hard-deletes the viewer's participant row so the viewer drops out of
 * attendance counters entirely. Paired with the two existing yes/no
 * pickers (InlineRsvpSection + RsvpPrompt) — once you've committed to
 * a response, this is the escape hatch.
 */
export function RemoveRsvpButton({
  shortId,
  triggerClassName = "inline-flex items-center gap-1 text-xs text-encre-400 underline-offset-4 hover:text-destructive hover:underline",
  triggerLabel = "Retirer",
  iconSize = 11,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("shortId", shortId);
      const result = await removeRsvpAction({}, fd);
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
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        <UserMinus size={iconSize} />
        {triggerLabel}
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
              className="fixed inset-0 z-40 bg-encre-700/50"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="remove-rsvp-title"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl bg-ivoire-50 p-6 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]"
            >
              <h3
                id="remove-rsvp-title"
                className="mb-2 font-serif text-lg leading-tight text-encre-700"
              >
                Retirer ta réponse&nbsp;?
              </h3>
              <p className="mb-6 text-sm text-encre-500">
                Ta réponse disparaîtra des compteurs. Tu pourras répondre à nouveau plus tard.
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
                  {pending ? "Suppression…" : "Retirer ma réponse"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
