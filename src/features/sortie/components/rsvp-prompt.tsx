"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  // Session.user.name for logged-in visitors; used as a fallback identity
  // when they tap "Je peux pas" without any past participant record.
  loggedInName?: string;
  outingTitle: string;
  outingUrl: string;
  outingDate: Date | null;
};

type SheetMode = "idle" | "yes" | "no-name-needed";

/**
 * Two-tier RSVP pattern — replaces the old single-sheet entry point.
 *
 * Layer 1: two huge buttons directly on the outing page ("J'en suis" /
 * "Je peux pas"). No modal, no overhead. Equal visual weight — one of
 * the RSVP-flow experts was explicit that a timid "no" poisons
 * attendance data.
 *
 * Layer 2: opens only when needed. Tapping "J'en suis" opens the detail
 * sheet (name, extras, handle_own, email). Tapping "Je peux pas" either
 * commits instantly (logged-in users or returning anons with a
 * remembered name) or pops a minimal "qui dit non ?" sheet (one field)
 * for first-timers. Fully symmetric: no value is captured twice, no
 * user is asked twice.
 *
 * Post-RSVP state shows as a status chip with "Modifier" affordance.
 */
export function RsvpPrompt({
  shortId,
  existingResponse,
  existingName,
  existingExtraAdults = 0,
  existingExtraChildren = 0,
  existingEmail,
  loggedInName,
  outingTitle,
  outingUrl,
  outingDate,
}: Props) {
  const router = useRouter();
  const [sheetMode, setSheetMode] = useState<SheetMode>("idle");
  const [stub, setStub] = useState<{ name: string } | null>(null);

  const knownName = existingName ?? loggedInName ?? "";

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

  // Current response summary rendered when the user already RSVP'd —
  // same two-button shape as the initial picker so they can switch sides
  // in one tap. The active side is highlighted; the inactive side takes
  // them through the switch flow (commit "no" / open yes-sheet).
  if (existingResponse) {
    const isComing = existingResponse !== "no";
    return (
      <>
        <div className="grid grid-cols-2 gap-3">
          <PageResponseButton
            icon={<Check size={22} strokeWidth={2.5} />}
            label={
              isComing
                ? summariseResponse(existingResponse, existingExtraAdults, existingExtraChildren)
                : "J'en suis"
            }
            tone="yes"
            active={isComing}
            onClick={handleYesTap}
          />
          <PageResponseButton
            icon={<X size={22} strokeWidth={2.5} />}
            label={isComing ? "Je peux plus" : "Je peux pas"}
            tone="no"
            active={!isComing}
            onClick={handleNoTap}
          />
        </div>

        {isComing && (
          <button
            type="button"
            onClick={handleYesTap}
            className="mt-3 inline-flex items-center gap-1 self-center text-sm text-encre-400 underline-offset-4 hover:text-bordeaux-700 hover:underline"
          >
            <Pencil size={12} />
            Modifier mes détails
          </button>
        )}

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
          existingResponse={existingResponse}
          existingName={existingName}
          existingExtraAdults={existingExtraAdults}
          existingExtraChildren={existingExtraChildren}
          existingEmail={existingEmail}
          loggedInName={loggedInName}
          outingTitle={outingTitle}
          outingUrl={outingUrl}
          outingDate={outingDate}
          onSuccess={(name, response) => {
            if (response !== "no") {
              setStub({ name: name.split(/\s+/)[0] ?? name });
            }
            setSheetMode("idle");
          }}
        />

        {stub && (
          <RsvpStub
            outingTitle={outingTitle}
            outingUrl={outingUrl}
            date={outingDate}
            userName={stub.name}
            onClose={() => setStub(null)}
          />
        )}
      </>
    );
  }

  // No response yet → the two big buttons.
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <PageResponseButton
          icon={<Check size={22} strokeWidth={2.5} />}
          label="J'en suis"
          tone="yes"
          onClick={handleYesTap}
        />
        <PageResponseButton
          icon={<X size={22} strokeWidth={2.5} />}
          label="Je peux pas"
          tone="no"
          onClick={handleNoTap}
        />
      </div>

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
        existingResponse={existingResponse ?? null}
        existingName={existingName}
        existingExtraAdults={existingExtraAdults}
        existingExtraChildren={existingExtraChildren}
        existingEmail={existingEmail}
        loggedInName={loggedInName}
        outingTitle={outingTitle}
        outingUrl={outingUrl}
        outingDate={outingDate}
        onSuccess={(name, response) => {
          if (response !== "no") {
            setStub({ name: name.split(/\s+/)[0] ?? name });
          }
          setSheetMode("idle");
        }}
      />

      {stub && (
        <RsvpStub
          outingTitle={outingTitle}
          outingUrl={outingUrl}
          date={outingDate}
          userName={stub.name}
          onClose={() => setStub(null)}
        />
      )}
    </>
  );
}

function PageResponseButton({
  icon,
  label,
  tone,
  active = true,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "yes" | "no";
  // `active` drives the "highlighted / muted" style pair. When both
  // buttons are shown post-RSVP, one is active (current response) and
  // the other is muted (the switch-to affordance). When both are shown
  // pre-RSVP the caller passes `active = true` for both and they look
  // equal-weight — deliberately, since discouraging "no" inflates
  // silent non-responses.
  active?: boolean;
  onClick: () => void;
}) {
  const palette = active
    ? tone === "yes"
      ? "bg-bordeaux-600 text-ivoire-50 shadow-[var(--shadow-lg)]"
      : "bg-encre-700 text-ivoire-50 shadow-[var(--shadow-lg)]"
    : "bg-white text-encre-600 border-2 border-encre-100";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-20 flex-col items-center justify-center gap-1 rounded-2xl px-3 text-center text-base font-black leading-tight tracking-tight transition-transform active:scale-95 ${palette}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function summariseResponse(response: Response, extraAdults: number, extraChildren: number): string {
  if (response === "no") {
    return "Tu ne viens pas";
  }
  const extras = extraAdults + extraChildren;
  const base = response === "handle_own" ? "Tu viens (billet perso)" : "Tu viens";
  if (extras === 0) {
    return base;
  }
  return `${base} +${extras}`;
}

/** Minimal sheet — only prénom — for first-time anons declining. */
function NoNameSheet({
  open,
  onOpenChange,
  shortId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    rsvpAction,
    {} as FormActionState
  );

  const wasPending = useRef(false);
  useEffect(() => {
    const justFinished = wasPending.current && !pending;
    wasPending.current = pending;
    if (justFinished && !state.errors && !state.message) {
      queueMicrotask(() => {
        onDone();
        router.refresh();
      });
    }
  }, [pending, state, router, onDone]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="theme-sortie max-h-[60dvh] overflow-y-auto">
        <SheetHeader className="mb-5 text-left">
          <SheetTitle className="font-serif text-2xl text-encre-700">Qui dit non ?</SheetTitle>
          <p className="text-sm text-encre-400">Juste ton prénom, on s&rsquo;arrête là.</p>
        </SheetHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="shortId" value={shortId} />
          <input type="hidden" name="response" value="no" />
          <input type="hidden" name="extraAdults" value="0" />
          <input type="hidden" name="extraChildren" value="0" />
          <Input
            autoFocus
            name="displayName"
            required
            maxLength={100}
            placeholder="Ton prénom"
            autoComplete="given-name"
            className="h-14 rounded-xl border-2 border-encre-100 bg-white text-center text-xl font-black tracking-tight"
          />
          {state.errors?.displayName?.[0] && (
            <p className="text-xs text-erreur-700">{state.errors.displayName[0]}</p>
          )}
          {state.message && (
            <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
              {state.message}
            </p>
          )}
          <div
            className="sticky -mx-6 -mb-6 flex justify-end border-t border-ivoire-400 bg-ivoire-50 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            style={{ bottom: 0 }}
          >
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "..." : "Confirmer"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Detail sheet for "J'en suis" — name, extras, handle_own, email. No
 * response pills: the user already chose by tapping the page button.
 * If existingResponse is "no" we land here via "Modifier" — user can
 * flip back to yes via the sheet's controls.
 */
function YesDetailSheet({
  open,
  onOpenChange,
  shortId,
  existingResponse,
  existingName,
  existingExtraAdults = 0,
  existingExtraChildren = 0,
  existingEmail,
  loggedInName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortId: string;
  existingResponse: Response | null;
  existingName?: string;
  existingExtraAdults?: number;
  existingExtraChildren?: number;
  existingEmail?: string;
  loggedInName?: string;
  outingTitle: string;
  outingUrl: string;
  outingDate: Date | null;
  onSuccess: (name: string, response: Response) => void;
}) {
  const [chosen, setChosen] = useState<Response>(
    existingResponse === "no" ? "yes" : (existingResponse ?? "yes")
  );
  const [adults, setAdults] = useState(existingExtraAdults);
  const [children, setChildren] = useState(existingExtraChildren);
  const [showExtras, setShowExtras] = useState(
    existingExtraAdults > 0 || existingExtraChildren > 0
  );

  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    rsvpAction,
    {} as FormActionState
  );

  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  useEffect(() => {
    const justFinished = wasPending.current && !pending;
    wasPending.current = pending;
    if (justFinished && !state.errors && !state.message) {
      const currentName =
        (formRef.current?.elements.namedItem("displayName") as HTMLInputElement | null)?.value ??
        existingName ??
        loggedInName ??
        "Toi";
      onSuccess(currentName, chosen);
    }
  }, [pending, state, existingName, loggedInName, chosen, onSuccess]);

  const hiddenFieldErrors = state.errors
    ? Object.entries(state.errors)
        .filter(([k]) => !["displayName", "email"].includes(k))
        .flatMap(([, msgs]) => msgs ?? [])
    : [];
  const generalError = state.message ?? hiddenFieldErrors[0] ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="theme-sortie max-h-[92dvh] overflow-y-auto">
        <SheetHeader className="mb-6 text-left">
          <SheetTitle className="font-serif text-2xl text-encre-700">
            {existingResponse ? "Modifier ta réponse" : "Super."}
          </SheetTitle>
          <p className="text-sm text-encre-400">Deux trois infos et c&rsquo;est fait.</p>
        </SheetHeader>

        <form ref={formRef} action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="shortId" value={shortId} />
          <input type="hidden" name="response" value={chosen} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName" className="text-[13px] font-medium text-encre-500">
              Ton prénom
            </Label>
            <Input
              id="displayName"
              name="displayName"
              required
              defaultValue={existingName ?? loggedInName}
              maxLength={100}
              placeholder="Claire"
              autoComplete="given-name"
            />
            {state.errors?.displayName?.[0] && (
              <p className="text-xs text-erreur-700">{state.errors.displayName[0]}</p>
            )}
          </div>

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

            <label className="flex items-start gap-3 rounded-lg border border-ivoire-400 bg-ivoire-50 p-3 text-sm text-encre-500">
              <input
                type="checkbox"
                checked={chosen === "handle_own"}
                onChange={(e) => setChosen(e.target.checked ? "handle_own" : "yes")}
                className="mt-0.5 h-4 w-4 accent-bordeaux-600"
              />
              <span className="flex flex-col">
                <span className="font-medium text-encre-700">Je prends mon billet moi-même</span>
                <span className="text-xs text-encre-400">
                  Coche si tu ne veux pas qu&rsquo;on achète ta place. Sinon, quelqu&rsquo;un du
                  groupe prendra pour toi — tu rembourseras après.
                </span>
              </span>
            </label>
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

          <div
            className="sticky -mx-6 -mb-6 flex justify-end border-t border-ivoire-400 bg-ivoire-50 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            style={{ bottom: 0 }}
          >
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "On y va…" : "Je confirme"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
