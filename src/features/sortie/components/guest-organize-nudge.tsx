"use client";

import Link from "next/link";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { trackOutingOrgCtaClick } from "@/features/sortie/lib/outing-telemetry";

type Props = {
  mode: "fixed" | "vote";
};

/**
 * Bannière d'acquisition virale affichée en bas de la page sortie publique
 * à un invité anonyme qui vient de RSVP positivement (`yes` ou `handle_own`).
 *
 * Hypothèse : le moment où l'invité tape "oui" en 1 tap sans créer de compte
 * est l'instant d'or pour lui suggérer d'organiser sa propre sortie — il
 * vient de vivre la magie produit, pas besoin d'une landing pour la décrire.
 *
 * Volontairement sobre (eyebrow mono + lien tertiaire underline, pas de gros
 * bouton acid) pour ne pas voler la place du RSVP et ne pas casser le ton
 * Acid Cabinet par un CTA marketing intrusif.
 */
export function GuestOrganizeNudge({ mode }: Props) {
  return (
    <aside
      className="mt-12 border-t border-surface-400 pt-6 text-center"
      aria-label="Toi aussi, tu organises une sortie ?"
    >
      <Eyebrow className="mb-2">─ tu organises ton tour ? ─</Eyebrow>
      <p className="mx-auto mb-3 max-w-md text-[15px] leading-[1.5] text-ink-500">
        Lance ta sortie en 30 secondes. Sans compte.
      </p>
      <Link
        href="/nouvelle?from=invite_cta"
        onClick={() => trackOutingOrgCtaClick({ mode })}
        className="inline-flex font-mono text-[11px] uppercase tracking-[0.22em] text-acid-600 underline-offset-4 hover:underline"
      >
        organiser une sortie →
      </Link>
    </aside>
  );
}
