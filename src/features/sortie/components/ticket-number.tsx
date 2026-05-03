type Props = {
  /** Numéro séquentiel par créateur. Null → ne rend rien (anon créateur,
   * sortie pré-PR5 sans backfill, edge cases legacy). */
  number: number | null;
  /** Handle public du créateur ("@camille"). Optionnel — affiché en
   * préfixe inline pour les contextes "third-party" (page event ouverte
   * via lien froid, carrousel "dans ton réseau"). Omis sur la home
   * identifiée où le créateur est implicite (c'est toi). */
  creatorHandle?: string | null;
  className?: string;
};

/**
 * Filigrane "ticket de spectacle" qui signe une sortie : `№ 047` ou
 * `@camille · № 047`. Référence éditoriale ticket / programme de
 * salle / festival pass — détail signature reconnaissable au scroll.
 *
 * Le numéro identifie l'événement, pas l'utilisateur : il appartient
 * à la sortie, est figé à la création (count + 1 des sorties du
 * créateur à cet instant), et reste stable même si une sortie
 * antérieure est supprimée. Privilège des comptes loggés — les
 * créateurs anon n'ont pas de compteur, donc `number={null}` rend
 * naturellement `null`.
 *
 * Padding fixe à 3 chiffres jusqu'à 999, puis sans padding au-delà
 * (un user avec 1000+ sorties n'a plus besoin de l'effet "édition").
 */
export function TicketNumber({ number, creatorHandle, className }: Props) {
  if (number === null) {
    return null;
  }
  const formatted = number < 1000 ? String(number).padStart(3, "0") : String(number);

  return (
    <span
      className={`font-mono text-[10.5px] uppercase tracking-[0.18em] tabular-nums text-ink-500 ${className ?? ""}`}
    >
      {creatorHandle ? `${creatorHandle} · ` : ""}№ {formatted}
    </span>
  );
}
