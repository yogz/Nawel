"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

type Props = {
  outingTitle: string;
  canonical: string;
  userEmail: string;
};

/**
 * Affiché quand l'utilisateur est connecté mais ni son `userId` ni son
 * cookie ne pointent vers un participant de cette sortie. Cas typique :
 * il a cliqué sur un lien partagé pour une sortie à laquelle il n'a
 * jamais RSVP, ou il est connecté avec le mauvais compte.
 *
 * On ne propose PAS le magic link ici (il est déjà loggé) — soit il va
 * RSVP sur la page de la sortie, soit il se déloggue pour réessayer
 * avec un autre email.
 */
export function NotParticipantNotice({ outingTitle, canonical, userEmail }: Props) {
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
      // Reload sur la même URL : sans session ni cookie qui matche, le
      // helper `loadParticipantPage` rebasculera en `needs-auth`, donc
      // l'utilisateur retrouvera le gate magic link au prochain rendu.
      window.location.reload();
    });
  }

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href={`/${canonical}`}
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          {outingTitle}
        </Link>
      </nav>

      <header className="mb-8 flex flex-col gap-4">
        <Eyebrow tone="muted">─ pas dans la liste ─</Eyebrow>
        <h1 className="font-display text-4xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl">
          T&rsquo;es pas dans les participants.
        </h1>
        <p className="text-[15px] leading-[1.5] text-ink-400">
          Tu es connecté avec <span className="text-ink-700">{userEmail}</span> mais on ne te trouve
          pas dans <span className="text-ink-700">{outingTitle}</span>. Si tu pensais y être,
          vérifie que c&rsquo;est le bon compte — ou inscris-toi depuis la page de la sortie.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <Link
          href={`/${canonical}`}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink-700 px-5 text-[15px] font-bold text-surface-50 transition-transform [transition-duration:var(--dur-fast)] hover:scale-[1.01] hover:bg-ink-600 motion-safe:active:scale-95"
        >
          Voir la sortie
          <ArrowRight size={16} strokeWidth={2.6} className="text-acid-600" />
        </Link>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 self-start font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400 underline-offset-4 transition-colors hover:text-hot-500 hover:underline disabled:opacity-50"
        >
          <LogOut size={12} strokeWidth={2.2} aria-hidden />
          {pending ? "Déconnexion…" : "Me déconnecter et réessayer"}
        </button>
      </div>
    </main>
  );
}
