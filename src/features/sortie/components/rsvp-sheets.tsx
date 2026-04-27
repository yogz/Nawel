"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { rsvpAction } from "@/features/sortie/actions/participant-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import { readAnonPrefs, writeAnonPrefs } from "@/features/sortie/lib/anon-rsvp-prefs";
import { GuestCountStepper } from "./guest-count-stepper";

export type RsvpResponse = "yes" | "no" | "handle_own";

/** Minimal sheet — only prénom — for first-time anons declining. */
export function NoNameSheet({
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
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    rsvpAction,
    {} as FormActionState
  );

  // Préremplissage anon : si l'invité a déjà saisi son prénom sur
  // une autre sortie depuis le même device, on le récupère depuis
  // localStorage. La donnée est origin-scoped sur sortie.colist.fr,
  // donc pas de fuite vers Colist www.
  const prefs = readAnonPrefs();

  const wasPending = useRef(false);
  useEffect(() => {
    const justFinished = wasPending.current && !pending;
    wasPending.current = pending;
    if (justFinished && !state.errors && !state.message) {
      // Persiste le prénom saisi pour pré-remplir les prochaines
      // sorties que l'utilisateur va RSVP depuis ce device.
      const submittedName =
        (formRef.current?.elements.namedItem("displayName") as HTMLInputElement | null)?.value ??
        "";
      if (submittedName) {
        writeAnonPrefs({ name: submittedName });
      }
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
          <SheetTitle className="font-serif text-2xl text-encre-700">Qui dit non&nbsp;?</SheetTitle>
          <p className="text-sm text-encre-400">Juste ton prénom, on s&rsquo;arrête là.</p>
        </SheetHeader>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="shortId" value={shortId} />
          <input type="hidden" name="response" value="no" />
          <input type="hidden" name="extraAdults" value="0" />
          <input type="hidden" name="extraChildren" value="0" />
          <Input
            autoFocus
            name="displayName"
            required
            maxLength={100}
            defaultValue={prefs?.name}
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
export function YesDetailSheet({
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
  existingResponse: RsvpResponse | null;
  existingName?: string;
  existingExtraAdults?: number;
  existingExtraChildren?: number;
  existingEmail?: string;
  loggedInName?: string;
  outingTitle: string;
  outingUrl: string;
  outingDate: Date | null;
  onSuccess: (name: string, response: RsvpResponse) => void;
}) {
  // Préremplissage anon : on lit les prefs UNE FOIS au mount du
  // composant. Les valeurs `existing*` (réponse à cette sortie
  // précisément) priment toujours sur les prefs (saisie sur une
  // autre sortie) — c'est juste un fallback.
  const prefs = readAnonPrefs();

  const [chosen, setChosen] = useState<RsvpResponse>(
    existingResponse === "no" ? "yes" : (existingResponse ?? "yes")
  );
  const [adults, setAdults] = useState(existingExtraAdults || prefs?.extraAdults || 0);
  const [children, setChildren] = useState(existingExtraChildren || prefs?.extraChildren || 0);
  const [showExtras, setShowExtras] = useState(
    existingExtraAdults > 0 ||
      existingExtraChildren > 0 ||
      (prefs?.extraAdults ?? 0) > 0 ||
      (prefs?.extraChildren ?? 0) > 0
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
      const currentEmail =
        (formRef.current?.elements.namedItem("email") as HTMLInputElement | null)?.value ?? "";
      // Persiste les valeurs saisies pour les prochaines sorties RSVP
      // depuis ce device. Best-effort : on n'échoue pas le commit si
      // localStorage est plein / désactivé.
      writeAnonPrefs({
        name: currentName,
        email: currentEmail,
        extraAdults: adults,
        extraChildren: children,
      });
      onSuccess(currentName, chosen);
    }
  }, [pending, state, existingName, loggedInName, chosen, onSuccess, adults, children]);

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
              autoComplete="given-name"
              required
              defaultValue={existingName ?? loggedInName ?? prefs?.name}
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
                  Coche si tu prends ta place toi-même. Sinon le groupe t&rsquo;en achète une, tu
                  rembourses après.
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
              defaultValue={existingEmail ?? prefs?.email}
              autoComplete="email"
              inputMode="email"
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
