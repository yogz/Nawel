"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bell, Calendar, Plus, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  dismissClaimPromptAction,
  submitEmailClaimAction,
} from "@/features/sortie/actions/claim-prompt-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

type Props = {
  /** Username de l'organisateur (route segment) — sert au callback OAuth
   * et à la metadata d'email. */
  creatorUsername: string;
  /** Origin absolue pour le callbackURL OAuth (cookie cross-subdomain
   * `.colist.fr`). Passé depuis le server pour éviter window.location en
   * SSR. */
  origin: string;
};

/**
 * Encart "À ton tour ?" placé au-dessus de la liste des sorties en mode
 * lien-privé. Apparaît seulement quand l'invité a ≥2 RSVP sans email.
 *
 * Pattern aligné sur `ReclaimForm` (dans `outing-detail`) : 1 ligne
 * discrète persistente, expand au tap pour révéler les actions. Pas de
 * sheet plein écran, pas de banner top intrusif — l'invité décide quand
 * il veut s'engager.
 *
 * Dismiss = cookie 30j (server action), la card disparaît immédiatement
 * via `dismissed` state (optimistic), le cookie évite de la re-render
 * au prochain page load.
 */
export function InboxClaimPrompt({ creatorUsername, origin }: Props) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [oauthPending, setOauthPending] = useState(false);
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    submitEmailClaimAction,
    {} as FormActionState
  );

  if (dismissed) {
    return null;
  }

  const sent = Boolean(state.message && !state.errors);

  async function handleGoogle() {
    setOauthPending(true);
    try {
      // signIn.social redirige le browser vers Google ; au retour, le
      // callbackURL ramène l'invité sur la page profil. Better Auth pose
      // les cookies de session sur `.colist.fr` (cross-subdomain), il
      // sera reconnu sur sortie.colist.fr immédiatement.
      // À ce stade ses rows participant restent cookie-only — on devra
      // les merger via une route post-OAuth dans une itération suivante,
      // mais sur le device courant la session+cookie suffit pour les
      // retrouver via getMyParticipant (lookup OR userId/cookieTokenHash).
      await authClient.signIn.social({
        provider: "google",
        callbackURL: `${origin}/@${creatorUsername}`,
      });
    } catch {
      setOauthPending(false);
    }
  }

  async function handleDismiss() {
    setDismissed(true);
    try {
      await dismissClaimPromptAction();
    } catch {
      // Échec serveur silencieux : l'utilisateur a déjà l'UI cachée pour
      // sa session, le cookie sera re-tenté au prochain dismiss.
    }
  }

  return (
    <section className="relative mb-8 overflow-hidden rounded-2xl border border-acid-600/30 bg-surface-100">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fermer"
        className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-700/5 hover:text-ink-600"
      >
        <X size={14} strokeWidth={2.4} />
      </button>

      {!open && !sent && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full px-4 py-4 pr-12 text-left transition-colors hover:bg-ink-700/[0.02]"
        >
          <Eyebrow className="mb-2">─ à toi de jouer ─</Eyebrow>
          <p className="font-display text-[18px] leading-[1.15] font-black tracking-[-0.02em] text-ink-700">
            Lance les tiennes, invite tes potes.
            <span className="text-acid-600"> →</span>
          </p>
          <p className="mt-2 inline-flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
            <span className="inline-flex items-center gap-1">
              <Bell size={11} strokeWidth={2.2} /> rappels
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} strokeWidth={2.2} /> agenda synchro
            </span>
            <span className="inline-flex items-center gap-1">
              <Plus size={11} strokeWidth={2.2} /> tes sorties
            </span>
          </p>
        </button>
      )}

      <AnimatePresence initial={false}>
        {open && !sent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 pt-4 pr-12">
              <Eyebrow className="mb-2">─ à toi de jouer ─</Eyebrow>
              <h2 className="mb-2 font-display text-[22px] leading-[1.1] font-black tracking-[-0.025em] text-ink-700">
                Lance ta sortie. Invite tes potes.
              </h2>
              <p className="mb-4 text-[14px] leading-[1.5] text-ink-500">
                On te rappelle la veille, ton agenda se synchronise tout seul, et tu retrouves tes
                réponses sur tous tes devices.
              </p>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={oauthPending || pending}
                className="mb-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink-700 px-4 text-[14px] font-semibold text-surface-50 transition-colors hover:bg-ink-600 disabled:opacity-60"
              >
                {oauthPending ? "Redirection…" : "Continuer avec Google"}
                <ArrowRight size={14} strokeWidth={2.4} />
              </button>

              <form action={formAction} className="flex flex-col gap-2">
                <input type="hidden" name="creatorUsername" value={creatorUsername} />
                <div className="flex items-center gap-2">
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="ton@mail.fr"
                    autoComplete="email"
                    inputMode="email"
                    disabled={pending || oauthPending}
                    className="h-11 flex-1 rounded-full border border-surface-400 bg-surface-50 px-4 text-[14px] text-ink-700 placeholder:text-ink-400 focus:border-acid-600 focus:outline-none disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={pending || oauthPending}
                    className="inline-flex h-11 items-center gap-1.5 rounded-full border border-acid-600 bg-acid-50 px-4 text-[13px] font-semibold text-acid-700 transition-colors hover:bg-acid-100 disabled:opacity-60"
                  >
                    {pending ? "Envoi…" : "Envoyer"}
                    <ArrowRight size={14} strokeWidth={2.4} />
                  </button>
                </div>
                {state.errors?.email?.[0] && (
                  <p className="text-[12px] text-destructive">{state.errors.email[0]}</p>
                )}
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
                  ↳ pas de spam, juste pour retrouver tes sorties
                </p>
              </form>
            </div>
          </motion.div>
        )}

        {sent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="px-4 py-5 pr-12"
          >
            <Eyebrow className="mb-2">─ envoyé ─</Eyebrow>
            <p className="font-display text-[18px] leading-[1.15] font-black tracking-[-0.02em] text-ink-700">
              {state.message}
            </p>
            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
              ↳ tape sur le lien dans l&rsquo;email pour te connecter
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
