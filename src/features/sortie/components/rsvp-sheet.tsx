"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { rsvpAction } from "@/features/sortie/actions/participant-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import { GuestCountStepper } from "./guest-count-stepper";

type Response = "yes" | "no" | "handle_own";

type Props = {
  shortId: string;
  existingResponse?: Response | null;
  existingName?: string;
  existingExtraAdults?: number;
  existingExtraChildren?: number;
  existingEmail?: string;
};

export function RsvpSheet({
  shortId,
  existingResponse,
  existingName,
  existingExtraAdults = 0,
  existingExtraChildren = 0,
  existingEmail,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Response | null>(existingResponse ?? null);
  const [adults, setAdults] = useState(existingExtraAdults);
  const [children, setChildren] = useState(existingExtraChildren);
  // Extras (+1 adults / +1 children) are edge cases — a "Avec quelqu'un ?"
  // toggle hides the steppers by default so the common path (tap Yes, type
  // your name, submit) stays two taps and one keystroke.
  const [showExtras, setShowExtras] = useState(
    existingExtraAdults > 0 || existingExtraChildren > 0
  );

  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    rsvpAction,
    {} as FormActionState
  );

  // Close the sheet once the action finishes with no errors. The state object
  // carries either { errors } or { message } on failure — empty means success.
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

  // Any error we don't show in-field (shortId, response, extras).
  const hiddenFieldErrors = state.errors
    ? Object.entries(state.errors)
        .filter(([k]) => !["displayName", "email"].includes(k))
        .flatMap(([, msgs]) => msgs ?? [])
    : [];
  const generalError = state.message ?? hiddenFieldErrors[0] ?? null;

  const buttonLabel = existingResponse ? "Modifier ma réponse" : "Je réponds";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="lg" className="px-10">
          {buttonLabel}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="theme-sortie max-h-[92dvh] overflow-y-auto">
        <SheetHeader className="mb-6 text-left">
          <SheetTitle className="font-serif text-2xl text-encre-700">Tu viens ?</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="shortId" value={shortId} />
          <input type="hidden" name="response" value={chosen ?? ""} />

          <div className="grid grid-cols-2 gap-3">
            <ResponsePill
              active={chosen === "yes"}
              onClick={() => setChosen("yes")}
              icon={<Check size={20} strokeWidth={2.5} />}
              label="J'en suis"
              tone="yes"
            />
            <ResponsePill
              active={chosen === "no"}
              onClick={() => setChosen("no")}
              icon={<X size={20} strokeWidth={2.5} />}
              label="Je peux pas"
              tone="no"
            />
          </div>
          <button
            type="button"
            onClick={() => setChosen("handle_own")}
            className={`self-start text-xs underline-offset-4 hover:underline ${
              chosen === "handle_own" ? "text-bordeaux-700" : "text-encre-400"
            }`}
          >
            Je gère ma place de mon côté{chosen === "handle_own" ? " ✓" : ""}
          </button>

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

          {chosen === "yes" && (
            <div className="flex flex-col gap-3">
              {!showExtras ? (
                <button
                  type="button"
                  onClick={() => setShowExtras(true)}
                  className="self-start text-sm text-bordeaux-700 underline-offset-4 hover:underline"
                >
                  + Avec quelqu&rsquo;un ?
                </button>
              ) : (
                <div className="flex flex-col gap-3 rounded-lg bg-ivoire-50 p-4">
                  <p className="text-sm text-encre-500">Tu viens avec quelqu&rsquo;un&nbsp;?</p>
                  <GuestCountStepper
                    label="Adultes en plus"
                    name="extraAdults"
                    value={adults}
                    onChange={setAdults}
                  />
                  <GuestCountStepper
                    label="Enfants en plus"
                    name="extraChildren"
                    value={children}
                    onChange={setChildren}
                  />
                </div>
              )}
              {!showExtras && (
                <>
                  <input type="hidden" name="extraAdults" value="0" />
                  <input type="hidden" name="extraChildren" value="0" />
                </>
              )}
            </div>
          )}

          {chosen !== "yes" && (
            <>
              <input type="hidden" name="extraAdults" value="0" />
              <input type="hidden" name="extraChildren" value="0" />
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium text-encre-500">
              Ton email <span className="text-encre-300">(facultatif)</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={existingEmail}
              placeholder="pour être prévenu·e des changements"
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

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={pending || !chosen}>
              {pending ? "On y va…" : "Je confirme"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ResponsePill({
  active,
  onClick,
  icon,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone: "yes" | "no";
}) {
  const palette = active
    ? tone === "yes"
      ? "border-bordeaux-600 bg-bordeaux-600 text-ivoire-50"
      : "border-encre-600 bg-encre-600 text-ivoire-50"
    : "border-ivoire-400 bg-ivoire-50 text-encre-700 hover:border-bordeaux-300";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 text-base font-semibold transition-all ${palette}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
