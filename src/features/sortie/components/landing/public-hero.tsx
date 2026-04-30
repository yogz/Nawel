"use client";

import Link from "next/link";
import { sendGAEvent } from "@/lib/umami";
import { LoginLink } from "@/features/sortie/components/login-link";

/**
 * Hero du `/` pour visiteur unauth fresh. Bloc autonome (pas de
 * `<main>` wrapper, fourni par `LandingV2` qui compose plusieurs
 * sections). Reprend le hero historique de `PublicHome` à l'identique
 * sauf pour la ligne `sans compte · sans install · 30 secondes` glissée
 * entre le CTA et le LoginLink — résout l'objection procédurale "faut
 * un compte ? une install ?" qui freine au tap (cf. plan landing v2).
 */
export function PublicHero() {
  return (
    <header className="relative flex min-h-[100dvh] flex-col items-start justify-center px-6 pt-[max(env(safe-area-inset-top),2rem)] pb-12">
      {/* Ambient acid + hot glow — pose le mood dès le paint. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 95% 0%, rgba(199,255,60,0.18) 0%, transparent 45%), radial-gradient(circle at 5% 95%, rgba(255,61,129,0.14) 0%, transparent 50%)",
        }}
      />
      <p className="mb-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-acid-600">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-acid-600 shadow-[0_0_12px_var(--sortie-acid)]"
        />
        sortie · v0.1
      </p>
      <h1
        className="-mx-2 mb-6 text-[56px] leading-[0.92] font-black tracking-[-0.04em] text-ink-700 sm:text-[76px]"
        style={{ textWrap: "balance" }}
      >
        Organise.
        <br />
        Ils répondent.
        <br />
        <span className="text-acid-600">Tu sais.</span>
      </h1>
      <p className="mb-10 max-w-md text-[17px] leading-[1.5] text-ink-400">
        Tu lances la sortie, tout le monde répond d&rsquo;un tap. Qui vient, qui prend les places,
        qui rembourse combien.{" "}
        <span className="text-ink-700">Tout d&rsquo;un coup d&rsquo;œil.</span>
      </p>

      <Link
        href="/nouvelle"
        onClick={() => sendGAEvent("event", "landing_cta_click", { position: "hero" })}
        className="group inline-flex items-center gap-2 rounded-full bg-acid-600 px-7 py-4 text-[17px] font-black text-ink-50 shadow-[var(--shadow-acid)] transition-transform [transition-duration:var(--dur-fast)] hover:scale-[1.02] motion-safe:active:scale-[0.98]"
        style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif" }}
      >
        Lancer une sortie
        <span
          aria-hidden
          className="transition-transform [transition-duration:var(--dur-base)] group-hover:translate-x-0.5"
        >
          →
        </span>
      </Link>

      {/* Bookend visuel avec l'eyebrow `sortie · v0.1` du haut. Lève les
          deux objections les plus communes au CTA acide (compte ?
          install ?) en mono brut, sans rajouter de chrome. */}
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400">
        sans compte · sans install · 30 secondes
      </p>

      <LoginLink
        className="mt-3 font-mono text-xs uppercase tracking-[0.22em] text-ink-500 hover:text-ink-700"
        label="j&rsquo;ai déjà un compte →"
        onClick={() => sendGAEvent("event", "landing_login_click", { position: "hero" })}
      />
    </header>
  );
}
