"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  archiveOutingAction,
  unarchiveOutingAction,
  type FormActionState,
} from "@/features/sortie/actions/outing-actions";
import { SwipeableArchivableCard } from "./swipeable-archivable-card";

type MinimalRow = {
  id: string;
  shortId: string;
  title: string;
};

type Item<R extends MinimalRow> = {
  row: R;
  node: ReactNode;
};

type Props<R extends MinimalRow> = {
  /**
   * Pre-rendered items. We take the JSX here rather than a `renderRow`
   * function because this component is a Client Component — RSC forbids
   * passing functions from Server → Client, and a render-prop crashes in
   * prod with "Functions cannot be passed directly to Client Components".
   */
  items: Array<Item<R>>;
  /** Past outings use a softer verb ("Retirer" + eye-off icon) — same
   * DB action, different wording. The expert UX review specifically
   * called out that "Annuler" on a past outing is nonsense. */
  isPast?: boolean;
  listClassName?: string;
};

/**
 * Client wrapper that renders a list of outing rows with swipe-to-archive
 * gesture + an undo toast. Callers render the cards themselves on the
 * server (plain list on /moi, OutingProfileCard on /@username) and pass
 * the resulting JSX in — we only add the gesture layer.
 *
 * Optimistic pattern: on commit, hide the row locally + show a 5s undo
 * toast + fire the server action in the background. Undo calls
 * unarchiveOutingAction. The server-action revalidates /moi so a
 * subsequent navigation picks up the persisted state.
 */
export function ArchivableOutingList<R extends MinimalRow>({
  items,
  isPast,
  listClassName,
}: Props<R>) {
  const [optimisticArchived, setOptimisticArchived] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ shortId: string; title: string; isPast: boolean } | null>(
    null
  );
  const toastTimerRef = useRef<number | null>(null);

  const visible = useMemo(
    () => items.filter(({ row }) => !optimisticArchived.has(row.shortId)),
    [items, optimisticArchived]
  );

  function scheduleDismiss() {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 5000);
  }

  async function handleCommit(row: R) {
    setOptimisticArchived((prev) => {
      const next = new Set(prev);
      next.add(row.shortId);
      return next;
    });
    setToast({ shortId: row.shortId, title: row.title, isPast: Boolean(isPast) });
    scheduleDismiss();

    const form = new FormData();
    form.append("shortId", row.shortId);
    // Fire-and-forget: if the server rejects, the local state still
    // hides the card for the session, and the next page load will
    // reveal the mismatch. Non-critical error path — archival is
    // idempotent and low-stakes.
    await archiveOutingAction({} as FormActionState, form);
  }

  async function handleUndo() {
    if (!toast) {
      return;
    }
    const shortId = toast.shortId;
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);

    const form = new FormData();
    form.append("shortId", shortId);
    await unarchiveOutingAction({} as FormActionState, form);
    setOptimisticArchived((prev) => {
      const next = new Set(prev);
      next.delete(shortId);
      return next;
    });
  }

  if (visible.length === 0 && !toast) {
    return null;
  }

  return (
    <>
      <ul className={listClassName ?? "flex flex-col gap-3"}>
        {visible.map(({ row, node }) => (
          <li key={row.id}>
            <SwipeableArchivableCard onCommit={() => handleCommit(row)} isPast={isPast}>
              {node}
            </SwipeableArchivableCard>
          </li>
        ))}
      </ul>
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            aria-live="polite"
            // Animate y + opacity only. Framer Motion composes its own
            // `transform` on the element, which would override the
            // Tailwind `-translate-x-1/2` centering and slide the toast
            // off the right edge. We position via left/right insets
            // inside the fixed container instead — safer.
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            // `calc()` on bottom pads above the iOS home indicator.
            // `max-w-xl` matches the app's content column; `mx-auto`
            // centers it horizontally without Tailwind transforms.
            style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
            className="fixed inset-x-4 z-50 mx-auto flex max-w-md items-center justify-between gap-4 rounded-full bg-ink-700 px-5 py-3 text-sm text-surface-50 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.4)]"
          >
            <span className="truncate">
              {toast.isPast ? "Retirée de ton profil" : "Sortie archivée"}
            </span>
            <button
              type="button"
              onClick={handleUndo}
              className="shrink-0 text-xs font-black uppercase tracking-[0.12em] text-hot-300 underline-offset-4 hover:underline"
            >
              Annuler
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
