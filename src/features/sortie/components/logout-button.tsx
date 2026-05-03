"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";

/**
 * Bouton de déconnexion sur la page `/sortie/moi`. Recharge l'origine
 * complète après signOut pour que le proxy host-based (sortie.colist.fr)
 * re-rende la home en état déconnecté sans laisser de cache client de
 * l'utilisateur précédent.
 */
export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await signOut();
      window.location.href = "/";
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex h-11 items-center gap-2 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-hot-600 disabled:opacity-50"
    >
      <LogOut size={14} strokeWidth={2.2} aria-hidden />
      {pending ? "…" : "se déconnecter"}
    </button>
  );
}
