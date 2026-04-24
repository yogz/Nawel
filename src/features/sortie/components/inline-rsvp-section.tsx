"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { removeRsvpAction, rsvpAction } from "@/features/sortie/actions/participant-actions";
import { NoNameSheet, YesDetailSheet, type RsvpResponse } from "./rsvp-sheets";

type Props = {
  shortId: string;
  outingTitle: string;
  outingUrl: string;
  outingDate: Date | null;
  existing: {
    response: RsvpResponse;
    name: string;
    extraAdults: number;
    extraChildren: number;
    email?: string;
  } | null;
  loggedInName?: string | null;
};

type SheetMode = "idle" | "yes" | "no-name-needed";

/**
 * Compact RSVP picker for the profile page cards. Mirrors the behavior of
 * `RsvpPrompt` (used on the outing page) but scaled down — the card is a
 * secondary surface, so the buttons are shorter and the status chip is
 * inline rather than the full-page chip+"Modifier" layout.
 *
 * Reuses `NoNameSheet` and `YesDetailSheet` from `rsvp-sheets.tsx` so the
 * actual data capture is identical whether the user RSVPs from the outing
 * page or from the profile card.
 */
export function InlineRsvpSection({
  shortId,
  outingTitle,
  outingUrl,
  outingDate,
  existing,
  loggedInName,
}: Props) {
  const router = useRouter();
  const [sheetMode, setSheetMode] = useState<SheetMode>("idle");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isRemoving, startRemoveTransition] = useTransition();

  const knownName = existing?.name ?? loggedInName ?? "";

  function handleRemove() {
    startRemoveTransition(async () => {
      const fd = new FormData();
      fd.set("shortId", shortId);
      const result = await removeRsvpAction({}, fd);
      if (result?.message) {
        setRemoveError(result.message);
        return;
      }
      setConfirmRemove(false);
      setRemoveError(null);
      router.refresh();
    });
  }

  async function commitNo(name: string) {
    const fd = new FormData();
    fd.set("shortId", shortId);
    fd.set("response", "no");
    fd.set("displayName", name);
    fd.set("extraAdults", "0");
    fd.set("extraChildren", "0");
    await rsvpAction({}, fd);
    router.refresh();
  }

  async function handleNoTap() {
    if (knownName.trim().length > 0) {
      await commitNo(knownName);
      return;
    }
    setSheetMode("no-name-needed");
  }

  function handleYesTap() {
    setSheetMode("yes");
  }

  const sheets = (
    <>
      <NoNameSheet
        open={sheetMode === "no-name-needed"}
        onOpenChange={(open) => setSheetMode(open ? "no-name-needed" : "idle")}
        shortId={shortId}
        onDone={() => setSheetMode("idle")}
      />
      <YesDetailSheet
        open={sheetMode === "yes"}
        onOpenChange={(open) => setSheetMode(open ? "yes" : "idle")}
        shortId={shortId}
        existingResponse={existing?.response ?? null}
        existingName={existing?.name}
        existingExtraAdults={existing?.extraAdults}
        existingExtraChildren={existing?.extraChildren}
        existingEmail={existing?.email}
        loggedInName={loggedInName ?? undefined}
        outingTitle={outingTitle}
        outingUrl={outingUrl}
        outingDate={outingDate}
        onSuccess={() => setSheetMode("idle")}
      />
    </>
  );

  if (existing) {
    const isComing = existing.response !== "no";
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            isComing ? "bg-bordeaux-600 text-ivoire-50" : "bg-encre-700 text-ivoire-50"
          }`}
        >
          {isComing ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
          {summariseResponse(existing.response, existing.extraAdults, existing.extraChildren)}
        </span>
        <button
          type="button"
          onClick={handleYesTap}
          className="inline-flex items-center gap-1 text-xs text-encre-400 underline-offset-4 hover:text-bordeaux-700 hover:underline"
        >
          <Pencil size={11} />
          Modifier
        </button>
        <button
          type="button"
          onClick={() => setConfirmRemove(true)}
          className="inline-flex items-center gap-1 text-xs text-encre-400 underline-offset-4 hover:text-destructive hover:underline"
        >
          <Trash2 size={11} />
          Retirer
        </button>
        {sheets}
        <RemoveRsvpDialog
          open={confirmRemove}
          onClose={() => {
            setConfirmRemove(false);
            setRemoveError(null);
          }}
          onConfirm={handleRemove}
          pending={isRemoving}
          error={removeError}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <CardResponseButton
        icon={<Check size={16} strokeWidth={2.5} />}
        label="J'en suis"
        tone="yes"
        onClick={handleYesTap}
      />
      <CardResponseButton
        icon={<X size={16} strokeWidth={2.5} />}
        label="Je peux pas"
        tone="no"
        onClick={handleNoTap}
      />
      {sheets}
    </div>
  );
}

function CardResponseButton({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "yes" | "no";
  onClick: () => void;
}) {
  const palette =
    tone === "yes"
      ? "bg-bordeaux-600 text-ivoire-50 hover:bg-bordeaux-700"
      : "bg-white text-encre-700 border-2 border-encre-100 hover:border-encre-700";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors active:scale-95 ${palette}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function RemoveRsvpDialog({
  open,
  onClose,
  onConfirm,
  pending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={pending ? undefined : onClose}
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
              Retirer ta réponse ?
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
                onClick={onClose}
                disabled={pending}
                className="inline-flex h-11 items-center justify-center rounded-md border border-encre-200 bg-ivoire-50 px-4 text-sm font-semibold text-encre-700 transition-colors hover:bg-ivoire-100 disabled:opacity-50"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={onConfirm}
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
  );
}

function summariseResponse(response: RsvpResponse, extraAdults: number, extraChildren: number) {
  if (response === "no") {
    return "Tu ne viens pas";
  }
  const extras = extraAdults + extraChildren;
  const base = response === "handle_own" ? "Tu viens (billet perso)" : "Tu viens";
  return extras === 0 ? base : `${base} +${extras}`;
}
