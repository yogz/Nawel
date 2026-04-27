"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
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

// Tap-cycle : undefined (pas voté) → true (oui) → false (non) → undefined.
// On distingue maintenant "non explicite" et "pas tranché", ce qui permet
// au pick suivant de différencier les participants à passer en `no` de
// ceux qui gardent leur response actuelle (cf. pickTimeslotAction).
type SlotVote = true | false;

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
  const [selected, setSelected] = useState<Record<string, SlotVote>>(() => {
    const init: Record<string, SlotVote> = {};
    for (const t of timeslots) {
      const prior = existingVotes[t.id];
      if (prior === true || prior === false) {
        init[t.id] = prior;
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

  // Tous les votes "tranchés" (oui ou non) sont envoyés ; les abstentions
  // (slot absent de `selected`) ne posent pas de row, ce qui laisse la
  // response actuelle du participant intacte au prochain pick.
  const serializedVotes = JSON.stringify(
    Object.entries(selected).map(([timeslotId, available]) => ({ timeslotId, available }))
  );

  const yesCount = Object.values(selected).filter((v) => v === true).length;
  const noCount = Object.values(selected).filter((v) => v === false).length;
  const totalCast = yesCount + noCount;

  function cycle(timeslotId: string) {
    setSelected((prev) => {
      const next = { ...prev };
      const cur = next[timeslotId];
      if (cur === undefined) {
        next[timeslotId] = true;
      } else if (cur === true) {
        next[timeslotId] = false;
      } else {
        delete next[timeslotId];
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
            Tape pour dire que tu peux, re-tape pour dire que tu peux pas, encore une fois pour
            effacer.
          </p>
        </SheetHeader>

        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="shortId" value={shortId} />
          <input type="hidden" name="votes" value={serializedVotes} />

          <ul className="flex flex-col gap-2">
            {timeslots.map((ts) => {
              const v = selected[ts.id];
              const status: "yes" | "no" | "idle" =
                v === true ? "yes" : v === false ? "no" : "idle";
              return (
                <li key={ts.id}>
                  <button
                    type="button"
                    onClick={() => cycle(ts.id)}
                    aria-label={
                      status === "yes"
                        ? `${formatOutingDateConversational(ts.startsAt)} : tu peux`
                        : status === "no"
                          ? `${formatOutingDateConversational(ts.startsAt)} : tu peux pas`
                          : `${formatOutingDateConversational(ts.startsAt)} : non voté`
                    }
                    aria-pressed={status === "yes"}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-all ${
                      status === "yes"
                        ? "border-bordeaux-600 bg-bordeaux-50 text-bordeaux-700"
                        : status === "no"
                          ? "border-or-500 bg-or-50 text-or-700"
                          : "border-ivoire-400 bg-ivoire-50 text-encre-700 hover:border-bordeaux-300"
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {formatOutingDateConversational(ts.startsAt)}
                    </span>
                    <span
                      className={`grid size-6 place-items-center rounded-full border-2 transition-all ${
                        status === "yes"
                          ? "border-bordeaux-600 bg-bordeaux-600 text-ivoire-50"
                          : status === "no"
                            ? "border-or-500 bg-or-500 text-ivoire-50"
                            : "border-encre-200"
                      }`}
                    >
                      {status === "yes" && <Check size={14} strokeWidth={3} />}
                      {status === "no" && <X size={14} strokeWidth={3} />}
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
                : totalCast === 0
                  ? "Envoyer (rien tranché)"
                  : yesCount > 0
                    ? `Envoyer (${yesCount} oui${noCount > 0 ? `, ${noCount} non` : ""})`
                    : `Envoyer (${noCount} non)`}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
