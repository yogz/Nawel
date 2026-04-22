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

type VoteState = "yes" | "no" | null;

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
  const [votes, setVotes] = useState<Record<string, VoteState>>(() => {
    const init: Record<string, VoteState> = {};
    for (const t of timeslots) {
      if (t.id in existingVotes) {
        init[t.id] = existingVotes[t.id] ? "yes" : "no";
      } else {
        init[t.id] = null;
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

  // Only include slots the participant actually opined on — not voting on a
  // slot is distinct from voting "not available" and lets the creator see
  // who still owes an answer.
  const serializedVotes = JSON.stringify(
    Object.entries(votes)
      .filter(([, v]) => v !== null)
      .map(([timeslotId, v]) => ({ timeslotId, available: v === "yes" }))
  );

  const hasAnyVote = Object.values(votes).some((v) => v !== null);

  function setVote(timeslotId: string, next: VoteState) {
    setVotes((prev) => ({ ...prev, [timeslotId]: next }));
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
          <SheetTitle className="font-serif text-2xl text-encre-700">Tes disponibilités</SheetTitle>
          <p className="text-sm text-encre-400">
            Coche les créneaux où tu peux. Tu pourras modifier tant que les votes sont ouverts.
          </p>
        </SheetHeader>

        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="shortId" value={shortId} />
          <input type="hidden" name="votes" value={serializedVotes} />

          <ul className="flex flex-col gap-2">
            {timeslots.map((ts) => (
              <li
                key={ts.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-ivoire-400 bg-ivoire-50 p-3"
              >
                <span className="text-sm text-encre-700">
                  {formatOutingDateConversational(ts.startsAt)}
                </span>
                <div className="flex gap-2">
                  <VoteButton
                    active={votes[ts.id] === "yes"}
                    variant="yes"
                    onClick={() => setVote(ts.id, votes[ts.id] === "yes" ? null : "yes")}
                    label="Dispo"
                  />
                  <VoteButton
                    active={votes[ts.id] === "no"}
                    variant="no"
                    onClick={() => setVote(ts.id, votes[ts.id] === "no" ? null : "no")}
                    label="Pas dispo"
                  />
                </div>
              </li>
            ))}
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

          <div className="flex items-center justify-end">
            <Button type="submit" size="lg" disabled={pending || !hasAnyVote}>
              {pending ? "On y va…" : "Envoyer mes votes"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function VoteButton({
  active,
  variant,
  onClick,
  label,
}: {
  active: boolean;
  variant: "yes" | "no";
  onClick: () => void;
  label: string;
}) {
  const palette =
    variant === "yes"
      ? active
        ? "bg-bordeaux-600 text-ivoire-100"
        : "text-encre-500 hover:bg-ivoire-100"
      : active
        ? "bg-encre-600 text-ivoire-100"
        : "text-encre-500 hover:bg-ivoire-100";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-full border border-ivoire-400 px-3 py-1.5 text-xs transition-colors ${palette}`}
    >
      {variant === "yes" ? <Check size={12} /> : <X size={12} />}
      {label}
    </button>
  );
}
