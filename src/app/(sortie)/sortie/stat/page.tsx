import { permanentRedirect } from "next/navigation";

// Anciennement page non-protégée → migrée sous /admin/stat avec
// gate role=admin. On garde un 308 pour les anciens bookmarks.
// NB : path public (sans préfixe `/sortie`) — sur sortie.colist.fr le
// proxy ré-écrit `/admin/stat` → `/sortie/admin/stat` interne. Renvoyer
// le path interne ici causerait un double-rewrite (/sortie/sortie/...).
export default function StatLegacyRedirect() {
  permanentRedirect("/admin/stat");
}
