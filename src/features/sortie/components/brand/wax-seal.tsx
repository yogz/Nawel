import type { ReactElement } from "react";

// Brand mark partagé entre l'OG (Satori dans `opengraph-image.tsx`) et
// les assets emails (route `/sortie/email-assets/wax-seal`). Le seal
// reste typographiquement identique partout — seules les couleurs du
// disque et de la lettre varient selon le fond cible. Naming = couleur
// du disque : `hot` (disque rose, contexte fond noir OG) et `acid`
// (disque vert, contexte fond crème email — cohérent avec l'icon app
// qui est aussi un disque acid plein). Toute évolution du dessin se
// fait ici.
//
// Le composant n'est pas un Server/Client Component React — c'est une
// fabrique de noeuds JSX consommée par `next/og` ImageResponse, qui ne
// supporte que les inline styles + un sous-ensemble de Flexbox. Pas de
// className, pas de pseudo, pas de @media.

export const WAX_SEAL_COLORS = {
  hot: { disc: "#FF3D81", letter: "#C7FF3C", ring: "#161616" },
  acid: { disc: "#C7FF3C", letter: "#0A0A0A", ring: "#0A0A0A" },
} as const;

export type WaxSealVariant = keyof typeof WAX_SEAL_COLORS;

export function WaxSeal({
  size,
  variant,
}: {
  size: number;
  variant: WaxSealVariant;
}): ReactElement {
  const colors = WAX_SEAL_COLORS[variant];
  // Le disque occupe ~78% du canvas pour laisser respirer la rotation
  // -6° et les rings sans clip, et offrir un padding transparent qui
  // protège le rendu si Gmail Dark Mode inverse autour du PNG.
  const disc = Math.round(size * 0.78);
  const ring1 = Math.max(2, Math.round(size * 0.022));
  const ring2 = ring1 + Math.max(1, Math.round(size * 0.011));
  // Lettre proportionnée au disque (≈50%), Inter Tight 900 tight tracking.
  const letterSize = Math.round(disc * 0.5);
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          width: disc,
          height: disc,
          borderRadius: "50%",
          backgroundColor: colors.disc,
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(-6deg)",
          boxShadow: `0 0 0 ${ring1}px ${colors.ring}, 0 0 0 ${ring2}px ${colors.disc}66`,
          color: colors.letter,
          fontSize: letterSize,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          fontFamily: '"Inter Tight", "Inter", system-ui',
        }}
      >
        S
      </div>
    </div>
  );
}
