import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
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
