// Détection du host Sortie pour les fichiers metadata Next (`robots.ts`,
// `sitemap.ts`) qui doivent dispatcher selon le sous-domaine. Le proxy
// fait un check similaire mais avec sa propre liste de dev hosts —
// pour les fichiers metadata, un préfixe simple suffit (les crawlers
// ne tapent que sur la prod).
export function isSortieHost(hostHeader: string | null | undefined): boolean {
  return Boolean(hostHeader?.startsWith("sortie."));
}
