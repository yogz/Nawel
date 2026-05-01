import { cn } from "@/lib/utils";

export type EyebrowTone = "acid" | "hot" | "muted";

type Props = {
  tone?: EyebrowTone;
  /** Préfixe avec un dot pulsé matchant le `tone`. Acid (12px halo) pour
   * "action/CTA", hot (10px halo) pour "urgence" (achat, paiement,
   * dettes). Muted+glow rend juste le dot ink-400 sans halo. */
  glow?: boolean;
  className?: string;
  children: React.ReactNode;
};

const TONE_COLOR: Record<EyebrowTone, string> = {
  acid: "text-acid-600",
  hot: "text-hot-500",
  muted: "text-ink-400",
};

const TONE_GLOW: Record<EyebrowTone, string> = {
  acid: "bg-acid-600 shadow-[0_0_12px_var(--sortie-acid)]",
  hot: "bg-hot-500 shadow-[0_0_10px_var(--sortie-hot)]",
  muted: "bg-ink-400",
};

/**
 * Eyebrow texte mono uppercase tracking-wide — primitive editoriale brut
 * de Sortie. ~74 callsites repo-wide partageaient le même template ;
 * centralise ici la combinaison `font-mono text-[10.5px] uppercase
 * tracking-[0.22em]` + couleur par tone, pour qu'un futur tone shift
 * (ex: passer le tracking à 0.20em) se fasse en 1 fichier.
 *
 * Le `tone` driveue la couleur. Pas de margin par défaut (responsabilité
 * du contexte, override via `className`). Children libre — l'auteur
 * compose son texte avec ou sans brackets `─ X ─`, c'est du contenu.
 */
export function Eyebrow({ tone = "acid", glow = false, className, children }: Props) {
  return (
    <p
      className={cn(
        "font-mono text-[10.5px] uppercase tracking-[0.22em]",
        TONE_COLOR[tone],
        glow && "inline-flex items-center gap-2",
        className
      )}
    >
      {glow && <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", TONE_GLOW[tone])} />}
      {children}
    </p>
  );
}
