"use client";

import * as React from "react";
import dynamic from "next/dynamic";

// Lazy-load la sheet : aucun JS de cmdk-like, AbortController ou
// localStorage tant que l'user n'a pas ouvert la recherche au moins
// une fois. Garde l'initial bundle home léger.
const HomeSearchSheet = dynamic(
  () => import("./home-search-sheet").then((m) => m.HomeSearchSheet),
  { ssr: false }
);

export function HomeSearchTrigger() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Cmd+K (mac) / Ctrl+K (win/linux) ouvre la recherche depuis n'importe
  // quel scroll de la home. preventDefault sinon le navigateur focus la
  // barre d'URL sur certaines combos.
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMounted(true);
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleOpen() {
    setMounted(true);
    setOpen(true);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Ramène le focus au trigger après fermeture (Radix le fait par
      // défaut, mais comme la sheet est lazy on s'assure qu'il pointe
      // bien sur ce bouton précis si plusieurs triggers existent).
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-label="Rechercher une sortie"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group flex h-11 min-w-0 flex-1 touch-manipulation items-center gap-2 border-b border-surface-400 px-2 text-left transition-colors duration-300 hover:border-acid-600 focus-visible:border-acid-600 focus-visible:outline-none active:border-acid-600"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400 transition-colors duration-300 group-hover:text-acid-600 group-focus-visible:text-acid-600">
          ─ trouve
        </span>
        <span
          aria-hidden="true"
          className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 md:inline"
        >
          ⌘K
        </span>
      </button>
      {mounted ? <HomeSearchSheet open={open} onOpenChange={handleOpenChange} /> : null}
    </>
  );
}
