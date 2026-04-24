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
import { RsvpStub } from "./rsvp-stub";

type Response = "yes" | "no" | "handle_own";

type Props = {
  shortId: string;
  existingResponse?: Response | null;
  existingName?: string;
  existingExtraAdults?: number;
  existingExtraChildren?: number;
  existingEmail?: string;
  // Context used to build the post-RSVP celebration stub. When all
  // three are present and the user said yes (or handle_own), the sheet
  // swaps for a full-screen ticket overlay instead of silently closing.
  outingTitle?: string;
  outingUrl?: string;
  outingDate?: Date | null;
};

export function RsvpSheet({
  shortId,
  existingResponse,
  existingName,
  existingExtraAdults = 0,
  existingExtraChildren = 0,
  existingEmail,
  outingTitle,
  outingUrl,
  outingDate,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Response | null>(existingResponse ?? null);
  const [adults, setAdults] = useState(existingExtraAdults);
  const [children, setChildren] = useState(existingExtraChildren);
  // Stored in state so the stub sticks around after the sheet closes —
  // `chosen` resets when the form remounts, but the stub should persist
  // until the user dismisses it.
  const [stub, setStub] = useState<{ name: string; response: Response } | null>(null);
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

  // Capture the submitted name BEFORE React clears the uncontrolled input
  // on re-render — we need it for the celebration stub.
  const formRef = useRef<HTMLFormElement>(null);

  // Close the sheet once the action finishes with no errors. The state object
  // carries either { errors } or { message } on failure — empty means success.
  const wasPending = useRef(false);
  useEffect(() => {
    const justFinished = wasPending.current && !pending;
    wasPending.current = pending;
    if (justFinished && !state.errors && !state.message) {
      const currentName =
        (formRef.current?.elements.namedItem("displayName") as HTMLInputElement | null)?.value ??
        existingName ??
        "Toi";
      // Only celebrate attendance — "no" gets a silent close. Both yes and
      // handle_own are "I'm coming" flavors and deserve the stub.
      const shouldCelebrate = chosen !== "no" && Boolean(outingTitle && outingUrl);
      queueMicrotask(() => {
        setOpen(false);
        if (shouldCelebrate && chosen) {
          setStub({ name: currentName.split(/\s+/)[0] ?? currentName, response: chosen });
        }
        router.refresh();
      });
    }
  }, [pending, state, router, chosen, existingName, outingTitle, outingUrl]);

  // Any error we don't show in-field (shortId, response, extras).
  const hiddenFieldErrors = state.errors
    ? Object.entries(state.errors)
        .filter(([k]) => !["displayName", "email"].includes(k))
        .flatMap(([, msgs]) => msgs ?? [])
    : [];
  const generalError = state.message ?? hiddenFieldErrors[0] ?? null;

  const buttonLabel = existingResponse ? "Modifier ma réponse" : "Je réponds";

  return (
    <>
      {stub && outingTitle && outingUrl && (
        <RsvpStub
          outingTitle={outingTitle}
          outingUrl={outingUrl}
          date={outingDate ?? null}
          userName={stub.name}
          onClose={() => setStub(null)}
        />
      )}
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

          <form ref={formRef} action={formAction} className="flex flex-col gap-5">
            <input type="hidden" name="shortId" value={shortId} />
            <input type="hidden" name="response" value={chosen ?? ""} />

            <div className="grid grid-cols-2 gap-3">
              <ResponsePill
                active={chosen === "yes" || chosen === "handle_own"}
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

            {(chosen === "yes" || chosen === "handle_own") && (
              <div className="flex flex-col gap-3">
                {!showExtras ? (
                  <button
                    type="button"
                    onClick={() => setShowExtras(true)}
                    className="self-start text-sm text-bordeaux-700 underline-offset-4 hover:underline"
                  >
                    + Tu viens accompagné&middot;e&nbsp;?
                  </button>
                ) : (
                  <div className="flex flex-col gap-3 rounded-lg bg-ivoire-50 p-4">
                    <p className="text-sm text-encre-500">Combien vous êtes&nbsp;?</p>
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

                <label className="flex items-start gap-3 rounded-lg border border-ivoire-400 bg-ivoire-50 p-3 text-sm text-encre-500">
                  <input
                    type="checkbox"
                    checked={chosen === "handle_own"}
                    onChange={(e) => setChosen(e.target.checked ? "handle_own" : "yes")}
                    className="mt-0.5 h-4 w-4 accent-bordeaux-600"
                  />
                  <span className="flex flex-col">
                    <span className="font-medium text-encre-700">Je gère mon billet</span>
                    <span className="text-xs text-encre-400">
                      Coche si tu prends ta place toi-même. Sinon le groupe t&rsquo;en achète une,
                      tu rembourses après.
                    </span>
                  </span>
                </label>
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

            {/* Sticky footer keeps the submit button visible when iOS Safari
              covers the bottom of the sheet with the soft keyboard — the
              name input is right above, so tapping submit used to mean
              scrolling past the keyboard first. */}
            <div
              className="sticky -mx-6 -mb-6 flex justify-end border-t border-ivoire-400 bg-ivoire-50 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              style={{ bottom: 0 }}
            >
              <Button type="submit" size="lg" disabled={pending || !chosen}>
                {pending ? "On y va…" : "Je confirme"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
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
