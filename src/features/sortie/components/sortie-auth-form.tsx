"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { authClient, signIn, useSession } from "@/lib/auth-client";
import { GoogleIcon } from "@/components/auth/google-icon";
import {
  checkAccountStatus,
  type AccountStatus,
} from "@/features/sortie/actions/account-status-action";

const RESEND_COOLDOWN_S = 30;

type Phase = "idle" | "magic-sent" | "password" | "verifying";

/**
 * Login dédié Sortie. Réutilise l'API Better Auth via `auth-client`
 * (donc la même logique que Colist), mais l'UI est entièrement
 * spécifique : charte Acid Cabinet, FR-only, pas de signup pwd
 * explicite (les comptes naissent silencieusement au RSVP).
 *
 * Hierarchie des flows :
 *   1. Magic link primary — réveille les comptes silent + crée un
 *      compte au verify si l'email est inconnu.
 *   2. Google OAuth secondary — UX one-tap, callback redirige vers
 *      sortie via le `callbackURL` Better Auth.
 *   3. Email/password tertiary — uniquement signin, exposé derrière
 *      un toggle. Pré-checké côté serveur via `checkAccountStatus`
 *      pour éviter de proposer ce path à un compte silent (no pwd).
 */
export function SortieAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refetch } = useSession();
  const token = searchParams.get("token");
  // Le `callbackURL` détermine où Better Auth renvoie l'utilisateur
  // après auth réussi (magic link, Google, email/pwd). On préserve la
  // page d'origine si elle est passée en query, sinon on tombe sur la
  // home Sortie. Sécurité : on rejette tout callback hors origin.
  const rawCallback = searchParams.get("callbackURL");
  const callbackURL = sanitizeCallback(rawCallback);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);

  // Magic link verify : si on arrive sur /login?token=…, on confirme
  // côté Better Auth et on redirige. Le pattern Colist (auth-form.tsx)
  // fait la même chose ; on le réplique simplement.
  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    setPhase("verifying");
    (async () => {
      try {
        const { error } = await authClient.magicLink.verify({
          query: { token, callbackURL },
        });
        if (cancelled) {
          return;
        }
        if (error) {
          setError(error.message || "Lien invalide ou expiré.");
          setPhase("idle");
          return;
        }
        await refetch();
        router.push(callbackURL);
        router.refresh();
      } catch {
        if (cancelled) {
          return;
        }
        setError("Lien invalide ou expiré.");
        setPhase("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, callbackURL, router, refetch]);

  // Décompte du cooldown "renvoyer le lien" en magic-sent. Évite que
  // l'utilisateur spamme le bouton et déclenche un rate limit Better Auth.
  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }
    const id = window.setInterval(() => setResendCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [resendCountdown]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Email invalide.");
      return;
    }

    setPending(true);
    try {
      // Pre-check : router selon l'état du compte. Évite l'erreur
      // "INVALID_CREDENTIALS" indistinguable sur un compte silent
      // (créé au RSVP avec email mais sans password).
      const status = await checkAccountStatus(email);
      setAccountStatus(status);

      if (status.banned) {
        setError("Connexion impossible. Contacte le support si tu penses que c'est une erreur.");
        return;
      }

      // Tous les autres cas → magic link. Better Auth gère l'auto-create
      // si l'email est inconnu. Le compte silent reçoit aussi un magic
      // link et s'active au verify.
      await sendMagicLink();
    } finally {
      setPending(false);
    }
  }

  async function sendMagicLink() {
    setError(null);
    setPending(true);
    try {
      const { error } = await signIn.magicLink({ email, callbackURL });
      if (error) {
        setError(error.message || "Impossible d'envoyer le lien — réessaie.");
        return;
      }
      setPhase("magic-sent");
      setResendCountdown(RESEND_COOLDOWN_S);
    } catch {
      setError("Impossible d'envoyer le lien — réessaie.");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setPending(true);
    try {
      // signIn.social redirige le browser vers Google ; pas de retour
      // côté client. Le `callbackURL` est embarqué dans la state OAuth
      // et utilisé par Better Auth pour redirect après le callback
      // /api/auth/callback/google sur www.colist.fr (cookie .colist.fr
      // partagé, donc on est logué sur sortie aussi).
      await signIn.social({ provider: "google", callbackURL });
    } catch {
      setError("Échec Google — réessaie.");
      setPending(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError("Mot de passe requis.");
      return;
    }
    setPending(true);
    try {
      const { error } = await signIn.email({ email, password, callbackURL });
      if (error) {
        setError(error.message || "Identifiants invalides.");
        return;
      }
      await refetch();
      router.push(callbackURL);
      router.refresh();
    } catch {
      setError("Identifiants invalides.");
    } finally {
      setPending(false);
    }
  }

  if (phase === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="size-8 animate-spin text-bordeaux-600" />
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-encre-400">
          ─ vérification ─
        </p>
      </div>
    );
  }

  if (phase === "magic-sent") {
    return (
      <div className="flex flex-col gap-6">
        <p className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-bordeaux-600 shadow-[0_0_12px_var(--sortie-acid)]"
          />
          ─ lien envoyé ─
        </p>
        <h1
          className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-encre-700"
          style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif" }}
        >
          Check tes mails.
        </h1>
        <p className="text-[15px] leading-[1.5] text-encre-400">
          Lien magique envoyé à <span className="text-encre-700">{email}</span>. Clique-le pour
          revenir ici, déjà connecté. (Vérifie aussi tes spams — Resend, c&rsquo;est nouveau.)
        </p>

        <div className="flex flex-col gap-2 pt-4">
          <button
            type="button"
            onClick={sendMagicLink}
            disabled={resendCountdown > 0 || pending}
            className="inline-flex items-center gap-1 self-start font-mono text-[11px] uppercase tracking-[0.22em] text-or-500 underline-offset-4 transition-colors hover:underline disabled:cursor-not-allowed disabled:text-encre-400 disabled:no-underline"
          >
            {resendCountdown > 0
              ? `Renvoyer le lien (dans ${resendCountdown}s)`
              : pending
                ? "Envoi…"
                : "Renvoyer le lien"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              setEmail("");
              setError(null);
            }}
            className="self-start font-mono text-[11px] uppercase tracking-[0.22em] text-encre-400 underline-offset-4 transition-colors hover:text-bordeaux-600 hover:underline"
          >
            Changer d&rsquo;email →
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-erreur-500/30 bg-erreur-50 p-3 text-[13px] text-erreur-700"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  // Phase "password" : on demande explicitement le mdp à un user qui a
  // un account credential connu. Sinon on cache ce path et on pousse
  // magic link.
  const canUsePassword = accountStatus?.exists && accountStatus.hasPassword;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-5">
        <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-or-500">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-or-500 shadow-[0_0_12px_var(--sortie-hot)]"
          />
          sortie · v0.1
        </p>
        <h1
          className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-encre-700 sm:text-5xl"
          style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif" }}
        >
          Reviens.
        </h1>
      </header>

      {phase === "password" && canUsePassword ? (
        <PasswordForm
          email={email}
          password={password}
          showPassword={showPassword}
          pending={pending}
          error={error}
          onPasswordChange={setPassword}
          onTogglePassword={() => setShowPassword((s) => !s)}
          onSubmit={handlePasswordSubmit}
          onBackToMagic={() => {
            setPhase("idle");
            setError(null);
          }}
        />
      ) : (
        <>
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-encre-400">
                Email
              </span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                className="h-12 w-full rounded-xl border border-ivoire-400 bg-ivoire-100 px-4 text-[15px] text-encre-700 placeholder:text-encre-400 focus:border-bordeaux-600 focus:outline-none focus:ring-2 focus:ring-bordeaux-600/30"
              />
            </label>

            <button
              type="submit"
              disabled={pending}
              className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-encre-700 px-5 text-[15px] font-bold text-ivoire-50 transition-transform [transition-duration:var(--dur-fast)] hover:scale-[1.01] hover:bg-encre-600 disabled:cursor-not-allowed disabled:opacity-60 motion-safe:active:scale-95"
            >
              {pending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Recevoir le lien
                  <ArrowRight size={16} strokeWidth={2.6} className="text-bordeaux-600" />
                </>
              )}
            </button>

            {error && (
              <p
                role="alert"
                className="mt-1 rounded-lg border border-erreur-500/30 bg-erreur-50 p-3 text-[13px] text-erreur-700"
              >
                {error}
              </p>
            )}
          </form>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-or-500/40" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-or-500">
              ou
            </span>
            <span className="h-px flex-1 bg-or-500/40" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={pending}
            className="inline-flex h-12 items-center justify-center gap-3 rounded-full bg-ivoire-100 px-5 text-[15px] font-semibold text-encre-700 ring-1 ring-encre-300 transition-colors hover:bg-ivoire-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon className="size-5" />
            Continuer avec Google
          </button>

          {accountStatus?.exists && accountStatus.hasPassword ? (
            <button
              type="button"
              onClick={() => {
                setPhase("password");
                setError(null);
              }}
              className="self-start font-mono text-[10.5px] uppercase tracking-[0.22em] text-or-500 underline-offset-4 transition-colors hover:underline"
            >
              J&rsquo;ai un mot de passe →
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                if (!email || !email.includes("@")) {
                  setError("Tape ton email d'abord.");
                  return;
                }
                const status = await checkAccountStatus(email);
                setAccountStatus(status);
                if (status.exists && status.hasPassword) {
                  setPhase("password");
                } else if (status.exists && !status.hasPassword) {
                  setError("Tu n'as pas encore de mot de passe — utilise plutôt le lien magique.");
                } else {
                  setError("On ne te connaît pas — lance le lien magique.");
                }
              }}
              className="self-start font-mono text-[10.5px] uppercase tracking-[0.22em] text-encre-400 underline-offset-4 transition-colors hover:text-or-500 hover:underline"
            >
              J&rsquo;ai un mot de passe →
            </button>
          )}
        </>
      )}

      <footer className="mt-4 border-t border-ivoire-400 pt-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-encre-400">
          ↳ pas de mot de passe oublié ici. Si tu en as besoin,{" "}
          <a
            href={`https://www.colist.fr/fr/login?callbackURL=${encodeURIComponent(callbackURL)}`}
            className="text-or-500 underline-offset-4 hover:underline"
          >
            passe par colist.fr
          </a>
        </p>
      </footer>
    </div>
  );
}

function PasswordForm(props: {
  email: string;
  password: string;
  showPassword: boolean;
  pending: boolean;
  error: string | null;
  onPasswordChange: (v: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onBackToMagic: () => void;
}) {
  return (
    <form onSubmit={props.onSubmit} className="flex flex-col gap-4">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-encre-400">
        ↳ {props.email}
      </p>

      <label className="flex flex-col gap-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-encre-400">
          Mot de passe
        </span>
        <div className="relative">
          <input
            // autoFocus à l'ouverture de ce sous-form ; le composant
            // ne s'instancie que via toggle, donc le focus se fait
            // pile au moment où l'utilisateur arrive ici (vs. un
            // useEffect + ref qui violait `react-hooks/refs`).
            autoFocus
            type={props.showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={props.password}
            onChange={(e) => props.onPasswordChange(e.target.value)}
            className="h-12 w-full rounded-xl border border-ivoire-400 bg-ivoire-100 px-4 pr-12 text-[15px] text-encre-700 focus:border-bordeaux-600 focus:outline-none focus:ring-2 focus:ring-bordeaux-600/30"
          />
          <button
            type="button"
            onClick={props.onTogglePassword}
            aria-label={props.showPassword ? "Masquer" : "Afficher"}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-encre-400 transition-colors hover:text-encre-700"
          >
            {props.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>

      <button
        type="submit"
        disabled={props.pending}
        className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-encre-700 px-5 text-[15px] font-bold text-ivoire-50 transition-transform [transition-duration:var(--dur-fast)] hover:scale-[1.01] hover:bg-encre-600 disabled:cursor-not-allowed disabled:opacity-60 motion-safe:active:scale-95"
      >
        {props.pending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            Connexion
            <ArrowRight size={16} strokeWidth={2.6} className="text-bordeaux-600" />
          </>
        )}
      </button>

      {props.error && (
        <p
          role="alert"
          className="rounded-lg border border-erreur-500/30 bg-erreur-50 p-3 text-[13px] text-erreur-700"
        >
          {props.error}
        </p>
      )}

      <button
        type="button"
        onClick={props.onBackToMagic}
        className="inline-flex items-center gap-1.5 self-start font-mono text-[10.5px] uppercase tracking-[0.22em] text-encre-400 underline-offset-4 transition-colors hover:text-bordeaux-600 hover:underline"
      >
        <Mail size={12} />
        Plutôt un lien magique
      </button>
    </form>
  );
}

/**
 * Sécurité : on accepte uniquement les callbacks vers le sub-domain
 * sortie ou l'origin du browser (préserve le tooling local). Tout
 * autre origin → fallback `/`. Évite un open-redirect via paramètre
 * `?callbackURL=https://attacker.com`.
 */
function sanitizeCallback(raw: string | null): string {
  if (!raw) {
    return "/";
  }
  try {
    // Path relatif → OK direct.
    if (raw.startsWith("/") && !raw.startsWith("//")) {
      return raw;
    }
    const url = new URL(raw);
    const allowed =
      url.hostname === "sortie.colist.fr" ||
      url.hostname.endsWith(".sortie.localhost") ||
      url.hostname === "sortie.localhost";
    return allowed ? `${url.pathname}${url.search}${url.hash}` || "/" : "/";
  } catch {
    return "/";
  }
}
