"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { resetDeviceAction } from "@/features/sortie/actions/reset-device-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  reclaimableEmail: string | null;
  hasReclaimableEmail: boolean;
  isCreatorWithoutEmail: boolean;
  anonName: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORAGE_KEY = "sortie:anon-rsvp-prefs";

/**
 * "Ce n'est pas moi" — déclencheur de reset device pour visiteur anon.
 *
 * Trois parcours :
 *   - **A. Email reclaimable détecté** → message rassurant magic-link,
 *     1-step confirm, bouton acid (action constructive).
 *   - **B. Pas d'email + pas créateur d'une sortie active** → warning
 *     rouge, champ email facultatif, bouton destructive par défaut qui
 *     repasse en acid si un email valide est saisi.
 *   - **C. Pas d'email + créateur d'une sortie active** (hard block) →
 *     warning explicite "tu perdras la main", champ email **requis**,
 *     bouton désactivé tant qu'aucun email valide saisi.
 *
 * Volontairement amincie après devil's advocate : pas de captcha
 * "tape ton prénom" (casse le scénario "j'ai prêté mon tel"), pas de
 * checkbox "Je comprends" (sur-friction sur action déjà explicite).
 */
export function ResetDeviceTrigger({
  reclaimableEmail,
  hasReclaimableEmail,
  isCreatorWithoutEmail,
  anonName,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    resetDeviceAction,
    {} as FormActionState
  );

  const wasPending = useRef(false);
  useEffect(() => {
    const justFinished = wasPending.current && !pending;
    wasPending.current = pending;
    if (justFinished && !state.errors && !state.message) {
      // Vide le cache localStorage de pré-remplissage côté client. Le
      // cookie httpOnly a déjà été supprimé côté serveur par l'Action.
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Quota / désactivé — sans conséquence, le reset reste valide.
      }
      toast.success("Appareil prêt pour un nouvel invité.");
      queueMicrotask(() => {
        setOpen(false);
        router.refresh();
      });
    }
  }, [pending, state, router]);

  const trimmedEmail = emailValue.trim();
  const isValidEmail = EMAIL_RE.test(trimmedEmail);
  const showEmailField = !hasReclaimableEmail;
  const isHardBlock = isCreatorWithoutEmail && !hasReclaimableEmail;
  const willRescue = trimmedEmail.length > 0 && isValidEmail;

  // Bouton destructive par défaut quand l'action est destructive (cas B
  // sans email saisi). Repasse en default (acid) dès qu'un email valide
  // est tapé — ou en cas A où il n'y a aucune perte.
  const buttonVariant: "default" | "destructive" =
    !showEmailField || willRescue ? "default" : "destructive";

  const buttonLabel = (() => {
    if (pending) {
      return "Un instant…";
    }
    if (isHardBlock) {
      return willRescue ? "Sauvegarder et réinitialiser" : "Sauvegarder d'abord";
    }
    if (showEmailField) {
      return willRescue ? "Sauvegarder et réinitialiser" : "Réinitialiser sans sauvegarder";
    }
    return "Confirmer";
  })();

  const submitDisabled = pending || (isHardBlock && !willRescue);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500 underline-offset-4 transition-colors duration-300 hover:text-ink-700 hover:underline"
      >
        ce n&rsquo;est pas moi →
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="theme-sortie max-h-[85dvh] overflow-y-auto"
          aria-describedby={showEmailField ? "reset-warning" : undefined}
        >
          <SheetHeader className="mb-5 text-left">
            <SheetTitle className="font-serif text-2xl text-ink-700">
              {hasReclaimableEmail
                ? "Tu pars ? On garde une trace pour toi."
                : isHardBlock
                  ? "Tu gères une sortie en cours."
                  : "Attention — tu n'as pas d'email enregistré"}
            </SheetTitle>
          </SheetHeader>

          {hasReclaimableEmail && reclaimableEmail && (
            <p className="mb-5 text-sm text-ink-500">
              Pour retrouver tes sorties plus tard, connecte-toi avec{" "}
              <strong className="text-ink-700">{reclaimableEmail}</strong> via un magic-link.
            </p>
          )}

          {showEmailField && (
            <div
              id="reset-warning"
              role="alert"
              className="mb-5 flex gap-3 rounded-xl border border-erreur-200 bg-erreur-50 p-3 text-sm text-erreur-900 dark:border-erreur-800 dark:bg-erreur-950 dark:text-erreur-100"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">
                  {isHardBlock
                    ? "Sans email, tu perdras la main sur ta sortie."
                    : "Tu ne pourras plus voir ni modifier tes RSVP."}
                </p>
                <p className="mt-1 text-erreur-700/90 dark:text-erreur-200/90">
                  {isHardBlock
                    ? "Donne-toi un email maintenant pour pouvoir continuer à la gérer."
                    : "L'organisateur les verra toujours, mais tu n'y auras plus accès depuis ce téléphone."}
                </p>
              </div>
            </div>
          )}

          <form ref={formRef} action={formAction} className="flex flex-col gap-4">
            {showEmailField && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reset-email" className="text-[13px] font-medium text-ink-500">
                  {isHardBlock ? "Ton email" : "Ton email"}
                  {!isHardBlock && <span className="text-ink-300"> (facultatif)</span>}
                </Label>
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="ton@email.com"
                  aria-invalid={trimmedEmail.length > 0 && !isValidEmail}
                />
                {state.errors?.email?.[0] && (
                  <p className="text-xs text-erreur-700">{state.errors.email[0]}</p>
                )}
                {anonName && <input type="hidden" name="name" value={anonName} />}
              </div>
            )}

            {state.message && (
              <p className="rounded-md border border-erreur-500/30 bg-erreur-50 p-3 text-sm text-erreur-700">
                {state.message}
              </p>
            )}

            <div
              className="sticky -mx-6 -mb-6 flex flex-wrap items-center justify-end gap-3 border-t border-surface-400 bg-surface-50 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              style={{ bottom: 0 }}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant={buttonVariant}
                disabled={submitDisabled}
                className="min-w-[180px] transition-colors duration-300"
              >
                {buttonLabel}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
