type Props = {
  title: string;
  /** Classes du wrapper (taille, rounded, ring, ombre…). */
  className?: string;
  /** Classes de l'initiale overlay (font-size, opacity…). Ignoré quand
   * `mode === "title"` — le sizing est dérivé de la longueur du titre. */
  textClassName?: string;
  /** Quand true, dérive un index 0–3 du hash du titre pour permuter les
   * positions des hot-spots du gradient. Anti "C C C C" quand plusieurs
   * titres commencent par la même lettre — utilisé sur le carrousel
   * "derniers ajoutés" où plusieurs cards sont visibles à la fois.
   * Default false → variant 0 fixe (préserve le rendu existant des
   * callsites en liste verticale, où la collision visuelle est moins
   * lisible côte-à-côte). */
  varied?: boolean;
  /** "initial" (default) = grosse lettre solo, calibré pour thumbnails
   * 48–64px. "title" = titre entier en typo poster, calibré pour cards
   * ≥ 140px de large (carousel posters). Adaptive sizing selon longueur. */
  mode?: "initial" | "title";
};

/**
 * Fallback poster-less partagé : initiale du titre sur radial-gradient
 * acid+hot, vocabulaire visuel signé Sortie. Centralise un pattern qui
 * était dupliqué dans `OutingProfileCard` et `RecentlyAddedRow` (le
 * `LiveStatusHero` garde sa propre variante avec un transparent stop
 * différent — fallback à pleine taille hero, calibré séparément).
 *
 * Hot-spots calibrés "texture" : alpha 0.35 au centre, transparent à
 * 30% (rayons resserrés). Sur les rangées denses (carrousel "dans ton
 * réseau"), 3 cards adjacentes saturées créaient un effet psyché qui
 * volait l'attention au hero. À ce niveau, la signature couleur reste
 * lisible mais ne crie plus.
 */
export function OutingPosterFallback({
  title,
  className,
  textClassName,
  varied = false,
  mode = "initial",
}: Props) {
  const variantIndex = varied ? hashTitle(title) % VARIANTS.length : 0;
  const { hotPos, acidPos } = VARIANTS[variantIndex];

  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden ${className ?? ""}`}
      style={{
        background: `radial-gradient(circle at ${hotPos}, rgba(255,61,129,0.35) 0%, transparent 30%), radial-gradient(circle at ${acidPos}, rgba(199,255,60,0.35) 0%, transparent 30%), #0f0f0f`,
      }}
    >
      {mode === "title" ? (
        <TitlePosterText title={title} />
      ) : (
        <span
          className={`font-display font-black leading-none tracking-tight text-ink-50 select-none ${textClassName ?? ""}`}
          style={{ mixBlendMode: "overlay" }}
        >
          {(title.trim().charAt(0) || "·").toLocaleUpperCase("fr")}
        </span>
      )}
    </div>
  );
}

/**
 * Titre rendu façon affiche brutaliste : sizing en 4 paliers selon le
 * nombre de caractères pour préserver la lisibilité sur 140-168px de
 * large. line-clamp à 4 pour borner les titres très longs (rare, mais
 * "Festival international du film d'animation d'Annecy" arrive). Uppercase
 * pour la cohérence avec le reste de la signature (eyebrows, badges).
 *
 * Texte sombre (`text-ink-50` qui dans la palette inversée Sortie est
 * la teinte la plus dark) façon sérigraphie sur poster — lisible et
 * "imprimé" sur les zones colorées du gradient. Pour rester lisible
 * aussi sur les zones noires du fond #0f0f0f entre les hot-spots, on
 * pose un text-shadow clair flou qui crée un halo lumineux derrière
 * le texte. Pas de mixBlendMode (testé "overlay" → faisait disparaître
 * le texte sur les zones non-glow).
 */
function TitlePosterText({ title }: { title: string }) {
  const trimmed = title.trim();
  const len = trimmed.length;
  // Paliers calibrés sur card 144px : titre court → impact maximal,
  // long → on garde 4 lignes lisibles. `break-words` force le wrap des
  // mots monstres ("Phalle", "Brandebourgeois") qui déborderaient sinon
  // la box au lieu de wrap au mot suivant.
  const sizeClass =
    len <= 12
      ? "text-[36px]"
      : len <= 22
        ? "text-[24px]"
        : len <= 36
          ? "text-[18px]"
          : "text-[14px]";

  return (
    <span
      className={`line-clamp-4 break-words px-3 text-center font-display font-black uppercase leading-[0.88] tracking-[-0.03em] text-ink-50 select-none ${sizeClass}`}
      style={{
        textWrap: "balance",
        // Halo clair flou : compense le texte sombre sur les zones
        // noires du fond, sans masquer la sérigraphie sur les zones
        // colorées. Triple stop pour bien envelopper les letterforms.
        textShadow:
          "0 0 6px rgba(245,242,235,0.55), 0 0 12px rgba(245,242,235,0.35), 0 1px 1px rgba(245,242,235,0.45)",
      }}
    >
      {trimmed}
    </span>
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
