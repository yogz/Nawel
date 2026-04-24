"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { castVoteAction } from "@/features/sortie/actions/participant-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";

type TimeslotOption = {
  id: string;
  startsAt: Date;
};

type Props = {
  shortId: string;
  timeslots: TimeslotOption[];
  existingVotes?: Record<string, boolean>;
  existingName?: string;
  existingEmail?: string;
  hasVoted: boolean;
};

export function VoteRsvpSheet({
  shortId,
  timeslots,
  existingVotes = {},
  existingName,
  existingEmail,
  hasVoted,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Single toggle per slot: true = available, undefined = not selected.
  // We no longer track an explicit "not available" state — unselected rows
  // are implicit no, and submitting with zero selections registers the
  // participant as unavailable. One tap per slot instead of two.
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const t of timeslots) {
      if (existingVotes[t.id] === true) {
        init[t.id] = true;
      }
    }
    return init;
  });

  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    castVoteAction,
    {} as FormActionState
  );

  const wasPending = useRef(false);
  useEffect(() => {
    const justFinished = wasPending.current && !pending;
    wasPending.current = pending;
    if (justFinished && !state.errors && !state.message) {
      queueMicrotask(() => {
        setOpen(false);
        router.refresh();
      });
    }
  }, [pending, state, router]);

  const hiddenFieldErrors = state.errors
    ? Object.entries(state.errors)
        .filter(([k]) => !["displayName", "email"].includes(k))
        .flatMap(([, msgs]) => msgs ?? [])
    : [];
  const generalError = state.message ?? hiddenFieldErrors[0] ?? null;

  const serializedVotes = JSON.stringify(
    Object.entries(selected)
      .filter(([, v]) => v)
      .map(([timeslotId]) => ({ timeslotId, available: true }))
  );

  const selectedCount = Object.values(selected).filter(Boolean).length;

  function toggle(timeslotId: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[timeslotId]) {
        delete next[timeslotId];
      } else {
        next[timeslotId] = true;
      }
      return next;
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="lg" className="px-10">
          {hasVoted ? "Modifier mes votes" : "Je vote"}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="theme-sortie max-h-[92dvh] overflow-y-auto">
        <SheetHeader className="mb-6 text-left">
          <SheetTitle className="font-serif text-2xl text-encre-700">
            Quand tu peux&nbsp;?
          </SheetTitle>
          <p className="text-sm text-encre-400">
            Coche les créneaux qui te vont. Rien de coché = tu peux pas.
          </p>
        </SheetHeader>

        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="shortId" value={shortId} />
          <input type="hidden" name="votes" value={serializedVotes} />

          <ul className="flex flex-col gap-2">
            {timeslots.map((ts) => {
              const active = !!selected[ts.id];
              return (
                <li key={ts.id}>
                  <button
                    type="button"
                    onClick={() => toggle(ts.id)}
                    aria-pressed={active}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-all ${
                      active
                        ? "border-bordeaux-600 bg-bordeaux-50 text-bordeaux-700"
                        : "border-ivoire-400 bg-ivoire-50 text-encre-700 hover:border-bordeaux-300"
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {formatOutingDateConversational(ts.startsAt)}
                    </span>
                    <span
                      className={`grid size-6 place-items-center rounded-full border-2 transition-all ${
                        active
                          ? "border-bordeaux-600 bg-bordeaux-600 text-ivoire-50"
                          : "border-encre-200"
                      }`}
                    >
                      {active && <Check size={14} strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName" className="text-[13px] font-medium text-encre-500">
              Ton prénom
            </Label>
            <Input
              id="displayName"
              name="displayName"
              required
              defaultValue={existingName}
              maxLength={100}
              placeholder="Claire"
              autoComplete="given-name"
            />
            {state.errors?.displayName?.[0] && (
              <p className="text-xs text-erreur-700">{state.errors.displayName[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium text-encre-500">
              Ton email <span className="text-encre-300">(facultatif)</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={existingEmail}
              placeholder="pour être prévenu·e quand la date est choisie"
            />
            {state.errors?.email?.[0] && (
              <p className="text-xs text-erreur-700">{state.errors.email[0]}</p>
            )}
          </div>

          {generalError && (
            <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
              {generalError}
            </p>
          )}

          <div
            className="sticky -mx-6 -mb-6 flex items-center justify-end border-t border-ivoire-400 bg-ivoire-50 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            style={{ bottom: 0 }}
          >
            <Button type="submit" size="lg" disabled={pending}>
              {pending
                ? "Envoi…"
                : selectedCount === 0
                  ? "Aucun ne me va"
                  : `Envoyer (${selectedCount})`}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
