import Link from "next/link";

/**
 * Mini-logo Sortie pour les pages d'atterrissage froid (login,
 * profil public d'organisateur). N'est pas posé sur les pages où
 * l'utilisateur a déjà le contexte d'app (home, /admin, /moi,
 * /[slugOrId]) — l'eyebrow contextuel + l'URL + le ton de la
 * copy y suffisent à porter l'identité.
 *
 * Distinct de `<Eyebrow>` par design : tracking-[0.28em] (vs
 * 0.22em) et dot statique (vs pulsé) — le but est de lire comme
 * "logo institutionnel figé" et pas comme un marqueur de section
 * vivant. Cliquable, ramène à `/` (escape hatch standard web).
 */
export function SortieMark() {
  return (
    <Link
      href="/"
      aria-label="Sortie — accueil"
      className="inline-flex items-center gap-1.5 rounded-sm font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-hot-500 transition-opacity duration-300 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-hot-500/40 focus-visible:outline-none"
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-hot-500 shadow-[0_0_8px_var(--sortie-hot)]"
      />
      Sortie
    </Link>
  );
}
