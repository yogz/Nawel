import { permanentRedirect } from "next/navigation";

// Anciennement page non-protégée → migrée sous /sortie/admin/stat avec
// gate role=admin. On garde un 308 pour les anciens bookmarks.
export default function StatLegacyRedirect() {
  permanentRedirect("/sortie/admin/stat");
}
