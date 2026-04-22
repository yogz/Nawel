"use client";

import { useActionState, useState } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { rsvpAction } from "@/features/sortie/actions/participant-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import { GuestCountStepper } from "./guest-count-stepper";

type Props = {
  shortId: string;
  existingResponse?: "yes" | "no" | "handle_own" | null;
  existingName?: string;
  existingExtraAdults?: number;
  existingExtraChildren?: number;
  existingEmail?: string;
};

type Step = "pick" | "yes-form";

const OPTIONS: {
  id: "yes" | "no" | "handle_own";
  icon: React.ReactNode;
  title: string;
  hint: string;
}[] = [
  { id: "yes", icon: <Check size={20} />, title: "J'en suis", hint: "Confirme ta place." },
  { id: "no", icon: <X size={20} />, title: "Je ne peux pas", hint: "On se rattrape au prochain." },
  {
    id: "handle_own",
    icon: <ExternalLink size={20} />,
    title: "Je gère ma place",
    hint: "Je prends mon billet de mon côté.",
  },
];

export function RsvpSheet({
  shortId,
  existingResponse,
  existingName,
  existingExtraAdults = 0,
  existingExtraChildren = 0,
  existingEmail,
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(existingResponse ? "yes-form" : "pick");
  const [chosen, setChosen] = useState<"yes" | "no" | "handle_own" | null>(
    existingResponse ?? null
  );
  const [adults, setAdults] = useState(existingExtraAdults);
  const [children, setChildren] = useState(existingExtraChildren);

  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    rsvpAction,
    {} as FormActionState
  );

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
          <SheetTitle className="font-serif text-2xl text-encre-700">
            {step === "pick" ? "Tu viens ?" : chosen === "yes" ? "Super." : "C'est noté."}
          </SheetTitle>
          {step === "yes-form" && chosen === "yes" && (
            <p className="text-sm text-encre-400">Deux trois infos et c&rsquo;est fait.</p>
          )}
        </SheetHeader>

        {step === "pick" && (
          <div className="flex flex-col gap-3">
            {OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setChosen(opt.id);
                  setStep("yes-form");
                }}
                className="flex items-start gap-3 rounded-lg border border-ivoire-400 bg-ivoire-100 p-4 text-left transition-colors hover:border-or-500 hover:bg-ivoire-50"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-or-500 text-or-700">
                  {opt.icon}
                </span>
                <span className="flex flex-col">
                  <span className="font-medium text-encre-700">{opt.title}</span>
                  <span className="text-sm text-encre-400">{opt.hint}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {step === "yes-form" && chosen !== null && (
          <form action={formAction} className="flex flex-col gap-5">
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
                defaultValue={existingName}
                maxLength={100}
                placeholder="Claire"
                autoComplete="given-name"
              />
              {state.errors?.displayName?.[0] && (
                <p className="text-xs text-erreur-700">{state.errors.displayName[0]}</p>
              )}
            </div>

            {chosen === "yes" ? (
              <div className="flex flex-col gap-3 rounded-lg bg-ivoire-50 p-4">
                <p className="text-sm text-encre-500">Tu viens avec quelqu&rsquo;un ?</p>
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
            ) : (
              <>
                <input type="hidden" name="extraAdults" value={0} />
                <input type="hidden" name="extraChildren" value={0} />
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

            {state.message && (
              <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
                {state.message}
              </p>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("pick")}
                className="text-sm text-encre-400 underline-offset-4 hover:text-bordeaux-700 hover:underline"
              >
                ← Changer d&rsquo;avis
              </button>
              <Button type="submit" size="lg" disabled={pending}>
                {pending
                  ? "On y va…"
                  : chosen === "yes"
                    ? "Je confirme"
                    : chosen === "no"
                      ? "C'est noté"
                      : "OK"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
