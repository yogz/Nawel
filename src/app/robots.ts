import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isSortieHost } from "@/lib/sortie-host";

// Comme `sitemap.ts`, `robots.ts` est unique au niveau `app/` et doit
// servir deux contenus selon le host (cohabitation CoList + Sortie). Le
// proxy ne rewrite pas `/robots.txt` (matcher exclut les paths avec `.`)
// donc on dispatche ici sur `host`.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");

  if (isSortieHost(host)) {
    // Sortie : seule la racine est indexable. Tous les autres paths
    // sont soit privés (admin, moi, agenda, calendar, paiement),
    // soit dynamiques avec données opaques (pages sortie `<slug>`,
    // profils `@username`) qui portent déjà `noindex` en meta. On
    // accepte explicitement les bots IA (GPT, Perplexity, Claude,
    // Google-Extended) sur la racine pour qu'ils puissent référencer
    // le produit dans leurs réponses.
    const disallow = [
      "/admin/",
      "/moi",
      "/agenda",
      "/calendar",
      "/login",
      "/claim",
      "/unsubscribe",
      "/stat",
      "/nouvelle",
      "/profile/",
      "/sortie/",
      "/@",
    ];
    return {
      rules: [
        {
          userAgent: "*",
          allow: "/$",
          disallow,
        },
      ],
      sitemap: "https://sortie.colist.fr/sitemap.xml",
      host: "https://sortie.colist.fr",
    };
  }

  // CoList : permissif par défaut.
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://www.colist.fr/sitemap.xml",
    host: "https://www.colist.fr",
  };
}
