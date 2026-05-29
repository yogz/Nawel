"use client";

import { ArrowRight } from "lucide-react";

// CTA du bandeau de statut de session. Client component autonome : il porte
// la logique de redirection (comme LoginLink) ET le décor spécifique du
// bandeau — voile acid au repos (lit « action » sans 2e nappe acid pleine),
// flèche, et un reflet one-shot qui balaie le bouton à l'apparition pour
// attirer l'œil, puis se tait (pas de boucle — cf. DESIGN_SYSTEM.md).
//
// Compute le href au click pour éviter que le SSR pré-rendre un href figé qui
// fuirait le window.location courant (même raison que LoginLink).
export function SessionStatusCta() {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const callback = encodeURIComponent(window.location.href);
    window.location.href = `/login?callbackURL=${callback}`;
  }

  return (
    <a
      href="/login"
      onClick={handleClick}
      className="relative inline-flex h-8 items-center overflow-hidden rounded-lg border border-acid-600/70 bg-acid-600/10 px-3 text-[13px] font-medium text-acid-600 transition-colors hover:bg-acid-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-400/50 motion-safe:animate-cta-pop motion-safe:duration-motion-tap motion-safe:active:scale-95"
    >
      {/* Reflet d'attention (2 passages) — éclat clair bien plus visible que le
          vert-sur-vert ; invisible au repos (gradient hors champ), masqué en
          reduced-motion pour ne pas figer un dégradé. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-3 inset-y-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent motion-safe:animate-acid-sheen motion-reduce:hidden"
      />
      S&apos;identifier
      <ArrowRight
        aria-hidden="true"
        className="ml-1 h-3.5 w-3.5 motion-safe:duration-motion-tap motion-safe:active:translate-x-0.5"
      />
    </a>
  );
}
