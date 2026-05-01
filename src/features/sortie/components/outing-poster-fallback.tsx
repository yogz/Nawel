type Props = {
  title: string;
  /** Classes du wrapper (taille, rounded, ring, ombre…). */
  className?: string;
  /** Classes de l'initiale overlay (font-size, opacity…). */
  textClassName?: string;
  /** Quand true, dérive un index 0–3 du hash du titre pour permuter les
   * positions des hot-spots du gradient. Anti "C C C C" quand plusieurs
   * titres commencent par la même lettre — utilisé sur le carrousel
   * "derniers ajoutés" où plusieurs cards sont visibles à la fois.
   * Default false → variant 0 fixe (préserve le rendu existant des
   * callsites en liste verticale, où la collision visuelle est moins
   * lisible côte-à-côte). */
  varied?: boolean;
};

/**
 * Fallback poster-less partagé : initiale du titre sur radial-gradient
 * acid+hot, vocabulaire visuel signé Sortie. Centralise un pattern qui
 * était dupliqué dans `OutingProfileCard` et `RecentlyAddedRow` (le
 * `LiveStatusHero` garde sa propre variante avec un transparent stop
 * différent — fallback à pleine taille hero, calibré séparément).
 */
export function OutingPosterFallback({ title, className, textClassName, varied = false }: Props) {
  const initial = (title.trim().charAt(0) || "·").toLocaleUpperCase("fr");
  const variantIndex = varied ? hashTitle(title) % VARIANTS.length : 0;
  const { hotPos, acidPos } = VARIANTS[variantIndex];

  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden ${className ?? ""}`}
      style={{
        background: `radial-gradient(circle at ${hotPos}, #FF3D81 0%, transparent 50%), radial-gradient(circle at ${acidPos}, #C7FF3C 0%, transparent 50%), #1a1a1a`,
      }}
    >
      <span
        className={`font-display font-black leading-none tracking-tight text-ink-50 select-none ${textClassName ?? ""}`}
        style={{ mixBlendMode: "overlay" }}
      >
        {initial}
      </span>
    </div>
  );
}

const VARIANTS = [
  { hotPos: "30% 20%", acidPos: "75% 80%" },
  { hotPos: "75% 25%", acidPos: "20% 75%" },
  { hotPos: "50% 85%", acidPos: "50% 15%" },
  { hotPos: "20% 50%", acidPos: "80% 50%" },
] as const;

function hashTitle(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}
