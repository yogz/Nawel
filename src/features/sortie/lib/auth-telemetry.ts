"use client";

import { sendGAEvent } from "@/lib/umami";

/**
 * Télémétrie du funnel d'authentification Sortie. Comble le gap §4 du
 * rapport analytics : avant cette PR, `SortieAuthForm` n'émettait rien
 * et toute mesure d'acquisition était aveugle (aucun event `login` /
 * `sign_up` n'arrivait depuis Sortie — ils venaient uniquement du
 * `AuthForm` CoList qui n'est pas utilisé ici).
 *
 * 2 events seulement, par défense contre la sur-instrumentation : un
 * `_started` au moment de la soumission (mesure le volume de tentatives,
 * survit aux redirects Google/magic-link) et un `_succeeded` quand on
 * a confirmation d'une session valide. Pas de `_failed` distinct — les
 * échecs sont déductibles par soustraction (`started - succeeded`) tant
 * que le volume reste faible. Si on a besoin de la cause précise plus
 * tard, ajouter `auth_signin_failed { reason }` en suivant la convention
 * `wizard_publish_failed.reason`.
 *
 * Convention de nom : `auth_signin_*` couvre les 3 méthodes (magic-link,
 * email/password, Google). Sortie ne distingue pas signup explicite vs
 * signin (les comptes naissent silencieusement au RSVP, le wizard
 * d'auth est toujours un "reviens" — voir le commentaire de
 * `sortie-auth-form.tsx`). Le flag `is_new_account` permet de
 * reconstituer un funnel signup à partir des `_succeeded`.
 */

type AuthMethod = "magic_link" | "email_password" | "google";

type Payload = Record<string, string | number | boolean | undefined>;

function track(name: "auth_signin_started" | "auth_signin_succeeded", payload?: Payload) {
  sendGAEvent("event", name, payload);
}

export function trackSortieAuthSigninStarted(method: AuthMethod) {
  track("auth_signin_started", { method });
}

/**
 * Émis quand Better Auth a validé l'auth et qu'on a une session.
 *
 * `is_new_account` :
 *   - `email_password` → toujours `false` (ce form ne fait jamais de
 *      signup pwd ; signup arrive via magic-link verify ou RSVP).
 *   - `magic_link` → `true` si `checkAccountStatus` (appelé pré-submit
 *      dans le même onglet) avait retourné `exists: false`. Sur un
 *      verify dans un autre onglet où le state a disparu, on tombe sur
 *      `false` par défaut (sous-estimation acceptée — on préfère ne
 *      pas inventer un signup qu'on ne peut pas confirmer).
 *   - `google` → non émis depuis ce form (le `signIn.social` redirige
 *      le browser sans retour) — un follow-up via détection
 *      first-session côté `SortieAnalyticsSessionSync` est possible.
 */
export function trackSortieAuthSigninSucceeded(params: {
  method: AuthMethod;
  isNewAccount: boolean;
}) {
  track("auth_signin_succeeded", {
    method: params.method,
    is_new_account: params.isNewAccount,
  });
}
