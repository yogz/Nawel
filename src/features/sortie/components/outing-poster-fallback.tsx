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
 * Découpe un titre éditorial en {héros, signature} sur le pattern
 * "Œuvre — Lieu/Format" très fréquent en théâtre/expo/concert/ciné.
 *
 * Sépare sur em-dash `—`, en-dash `–`, deux-points `:` ou hyphen entouré
 * d'espaces ` - `. On NE coupe PAS sur un hyphen collé (ex.
 * "Avant-première") — c'est un mot composé, pas une signature de lieu.
 *
 * Le découpage permet d'afficher le héros en typo poster massive et la
 * signature en mono discret dessous (cartel d'expo) au lieu de mettre
 * tout le titre en énorme, le tronquer avec ellipsis et avoir à le
 * répéter en propre sous la card.
 */
function splitTitle(raw: string): { hero: string; tail: string | null } {
  const trimmed = raw.trim();
  // Ordre testé : em-dash > en-dash > " - " (hyphen entouré) > " : ".
  // Le ` : ` est conservatif (espace avant et après) pour ne pas couper
  // un titre type "Avant-première : Le dernier".
  const separators = [" — ", " – ", " - ", " : "];
  for (const sep of separators) {
    const idx = trimmed.indexOf(sep);
    if (idx > 0 && idx < trimmed.length - sep.length) {
      const hero = trimmed.slice(0, idx).trim();
      const tail = trimmed.slice(idx + sep.length).trim();
      if (hero.length > 0 && tail.length > 0) {
        return { hero, tail };
      }
    }
  }
  return { hero: trimmed, tail: null };
}

/**
 * Titre rendu façon poster : on garde UNIQUEMENT le "héros" (ce qui
 * vient avant le séparateur " — " / " : "). Le lieu / format n'est pas
 * affiché ici — il vit sur la page de détail. Logique poster :
 *
 *     HAMLET                          (au lieu de "HAMLET — Théâtre…")
 *     EXPO NIKI DE SAINT PHALLE       (pas de tiret → titre entier)
 *
 * Texte crème assourdi (`/80`) avec ombre noire renforcée pour effet
 * "imprimé" plutôt que "luminescent". On a essayé crème pur → trop
 * clair, faisait halo. Texte sombre + halo crème → effet boueux.
 * Le mat foncé sur fond gradient est la combinaison qui ne crie pas.
 */
function TitlePosterText({ title }: { title: string }) {
  const { hero } = splitTitle(title);
  const heroLen = hero.length;
  // 3 paliers calibrés pour qu'un mot court tienne sans ellipsis dans
  // une card 144px. Unbounded Black est très large : à 28px, ~6 char
  // = ~135px, "HAMLET" tient. Au-delà on descend agressivement.
  const heroSizeClass =
    heroLen <= 6
      ? "text-[28px] leading-[0.9]"
      : heroLen <= 14
        ? "text-[20px] leading-[0.95]"
        : "text-[15px] leading-[1]";

  return (
    // pb-9 réserve la zone basse pour la pill auteur. justify-center
    // place le héros au centre optique de la zone haute disponible.
    <div className="flex h-full w-full items-center justify-center px-3 pt-2 pb-9 text-center">
      <span
        className={`font-display font-black uppercase tracking-[-0.025em] text-ink-700/80 select-none ${heroSizeClass}`}
        style={{
          textWrap: "balance",
          // Ombre noire portée renforcée : assombrit l'effet "luminescent"
          // qu'avait le crème pur, donne une qualité "imprimé/sérigraphié".
          // 2 stops courts, jamais de glow.
          textShadow: "0 1px 2px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.65)",
          overflowWrap: "anywhere",
          // `clip` au lieu d'`ellipsis` : si le sizing déborde quand
          // même (cas extrême), on coupe net au bord de la card façon
          // sérigraphie, pas avec "…" qui ralentit la lecture.
          textOverflow: "clip",
        }}
      >
        {hero}
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
