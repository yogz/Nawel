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
 * Titre rendu façon cartel d'expo : un "héros" en Unbounded Black +
 * une "signature" en mono discret (séparation au tiret/deux-points).
 * Pattern poster :
 *
 *     HAMLET
 *     théâtre de la ville
 *
 * Texte crème (`text-ink-700`) avec ombre noire fine pour lisibilité
 * sur les blobs acid+hot ET sur les zones noires entre les hot-spots.
 * On a essayé l'inverse (texte sombre + halo crème) — résultat : effet
 * boueux sur le texte, halo trop fort qui parasitait le scan.
 *
 * Pas d'ellipsis : on calibre le sizing pour que le héros tienne dans
 * la card. La pill auteur est en-dessous (zone réservée pb-9), donc le
 * contenu est centré dans la zone disponible au-dessus.
 */
function TitlePosterText({ title }: { title: string }) {
  const { hero, tail } = splitTitle(title);
  const heroLen = hero.length;
  // 3 paliers calibrés pour qu'un mot court tienne sans ellipsis dans
  // une card 144px. Unbounded Black est très large : à 32px, ~6 char
  // = ~140px, donc "HAMLET" tient pile. Au-delà on descend agressivement.
  // 14px en bas — sous ce seuil Unbounded Black devient peu lisible mais
  // c'est mieux que tronquer un titre que le user vient découvrir.
  const heroSizeClass =
    heroLen <= 6
      ? "text-[28px] leading-[0.9]"
      : heroLen <= 14
        ? "text-[20px] leading-[0.95]"
        : "text-[15px] leading-[1]";

  return (
    // pb-9 réserve la zone basse pour la pill auteur (bottom-2 + h~24px).
    // justify-center centre le bloc texte dans la zone haute restante,
    // ce qui place le héros au centre optique de la card et la signature
    // collée juste en dessous (pas centrée seule).
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 pt-2 pb-9 text-center">
      <span
        className={`font-display font-black uppercase tracking-[-0.025em] text-ink-700 select-none ${heroSizeClass}`}
        style={{
          textWrap: "balance",
          // Ombre noire portée fine : renforce le contraste sur les
          // blobs acid+hot (le crème pur s'aplatit sinon sur acide).
          // Stops courts, pas de glow : on veut un trait, pas un halo.
          textShadow: "0 1px 2px rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.55)",
          overflowWrap: "anywhere",
          // `clip` au lieu d'`ellipsis` : si le sizing déborde quand
          // même (cas extrême), on coupe net au bord de la card façon
          // sérigraphie, pas avec "…" qui ralentit la lecture.
          textOverflow: "clip",
        }}
      >
        {hero}
      </span>
      {tail && (
        // Signature cartel : mono lowercase à 75% d'opacité, ancrée
        // juste sous le héros (pas centrée seule). overflow-hidden +
        // textOverflow clip pour qu'on coupe net si la signature
        // déborde, plutôt que d'ajouter une ellipsis.
        <span
          className="font-mono text-[10px] leading-[1.15] tracking-[0.04em] text-ink-700/75 select-none"
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.85)",
            overflowWrap: "anywhere",
            textOverflow: "clip",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {tail.toLocaleLowerCase("fr")}
        </span>
      )}
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
