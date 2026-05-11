import { createElement } from "react";
import { ImageResponse } from "next/og";
import { WaxSeal } from "@/features/sortie/components/brand/wax-seal";

// PNG du wax seal Sortie servi aux clients email. URL stable :
// https://sortie.colist.fr/sortie/email-assets/wax-seal. Référencée par
// `renderEmail()` dans `src/features/sortie/lib/emails/layout.ts`.
//
// 128×128 = retina @2x pour un rendu visuel à 64×64 dans le header
// email (l'`<img width="64" height="64">` resample). Variante "acid"
// (disque vert + S noir) — cohérent avec l'icon app qui est aussi un
// disque acid plein. La variante "hot" du OG ne marche que sur fond noir.
//
// `route.ts` (pas .tsx) par convention Next pour les route handlers :
// `createElement` évite JSX ici tout en réutilisant le composant
// partagé. La marque évolue dans `wax-seal.tsx`, l'asset se régénère
// au prochain build.

export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(createElement(WaxSeal, { size: 128, variant: "acid" }), {
    width: 128,
    height: 128,
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/png",
    },
  });
}
