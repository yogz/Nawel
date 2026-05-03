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
 * Titre rendu façon affiche brutaliste, version cartel d'expo : un
 * "héros" en Unbounded Black énorme + une "signature" en mono discret
 * dessous (séparation au tiret/deux-points). Pattern poster :
 *
 *     HAMLET
 *     théâtre de la ville
 *
 * Sizing 3 paliers calibré sur le HÉROS (pas le titre complet) — un
 * héros court doit rester énorme même si la signature derrière est
 * longue. Pas d'ellipsis : si ça déborde on accepte 3 lignes max et le
 * sizing descend, mais on ne coupe jamais mid-word, c'est l'esthétique
 * sérigraphie. Pour rester lisible sur les zones noires entre les
 * hot-spots, halo crème léger derrière le texte (testé "overlay" →
 * faisait disparaître le texte sur les zones non-glow).
 */
function TitlePosterText({ title }: { title: string }) {
  const { hero, tail } = splitTitle(title);
  const heroLen = hero.length;
  // 3 paliers (vs 4 avant) : éviter la cacophonie de rythmes sur un
  // scroll horizontal. Borné à 22px en bas — sous ce seuil Unbounded
  // Black devient une tache illisible.
  const heroSizeClass =
    heroLen <= 6
      ? "text-[44px] leading-[0.85]"
      : heroLen <= 12
        ? "text-[30px] leading-[0.9]"
        : "text-[22px] leading-[0.95]";
  // Quand pas de signature (titre simple sans tiret), on autorise 3
  // lignes au héros pour qu'un titre type "Festival d'Annecy" tienne
  // sans devoir descendre au palier 22px.
  const heroLineClamp = tail ? "line-clamp-2" : "line-clamp-3";

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center">
      <span
        className={`break-words font-display font-black uppercase tracking-[-0.025em] text-ink-50 select-none ${heroSizeClass} ${heroLineClamp}`}
        style={{
          textWrap: "balance",
          // Halo clair flou : compense le texte sombre sur les zones
          // noires du fond, sans masquer la sérigraphie sur les zones
          // colorées. Triple stop pour bien envelopper les letterforms.
          textShadow:
            "0 0 6px rgba(245,242,235,0.55), 0 0 12px rgba(245,242,235,0.35), 0 1px 1px rgba(245,242,235,0.45)",
          overflowWrap: "anywhere",
        }}
      >
        {hero}
      </span>
      {tail && (
        // Signature cartel : mono lowercase à 70% d'opacité, max 2
        // lignes. Le break-word "anywhere" autorise la coupe en cours
        // de mot pour les noms de salles longs ("Théâtre des Champs-
        // Élysées") plutôt que de les tronquer avec ellipsis.
        <span
          className="line-clamp-2 font-mono text-[10.5px] leading-tight tracking-[0.04em] text-ink-50/70 select-none"
          style={{
            textShadow: "0 0 4px rgba(245,242,235,0.5)",
            overflowWrap: "anywhere",
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
