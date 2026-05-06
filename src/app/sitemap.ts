import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { routing } from "@/i18n/routing";

// Les deux apps (CoList et Sortie) cohabitent dans le même Next : le
// fichier `sitemap.ts` est unique au niveau `app/`, mais doit servir
// deux contenus distincts selon le host de la requête. Le proxy ne
// rewrite pas les paths avec `.` (matcher), donc `/sitemap.xml` arrive
// brut ici et on doit dispatcher sur le hostname.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host") ?? "";
  if (host.startsWith("sortie.")) {
    return [
      {
        url: "https://sortie.colist.fr/",
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 1,
      },
    ];
  }

  const baseUrl = "https://www.colist.fr";
  const locales = routing.locales;

  const routes = ["", "/login", "/contact", "/behind-the-scenes", "/demo", "/marketing-kit"];

  const getPriority = (route: string) => {
    if (route === "") return 1;
    if (route === "/behind-the-scenes") return 0.9;
    return 0.8;
  };

  const getChangeFrequency = (route: string): "daily" | "weekly" | "monthly" => {
    if (route === "") return "daily";
    if (route === "/behind-the-scenes") return "weekly";
    return "monthly";
  };

  const sitemapEntries: MetadataRoute.Sitemap = [];

  locales.forEach((locale) => {
    routes.forEach((route) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: getChangeFrequency(route),
        priority: getPriority(route),
        alternates: {
          languages: Object.fromEntries(locales.map((l) => [l, `${baseUrl}/${l}${route}`])),
        },
      });
    });
  });

  return sitemapEntries;
}
