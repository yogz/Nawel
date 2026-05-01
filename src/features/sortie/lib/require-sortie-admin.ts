import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-config";

// `role` vit sur la table `user` (default "user"), promu via le plugin
// admin de Better Auth (`adminRoles: ["admin"]` dans auth-config). Un
// admin côté `(colist)` est admin partout — cookies sur `.colist.fr`.

export async function getSortieAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  if (session.user.role !== "admin") return null;
  return session;
}

/**
 * À utiliser dans les Server Components / layouts admin. Redirect
 * vers la home si non authentifié OU non-admin. Pas de message
 * d'erreur — on ne donne aucune info à un attaquant.
 *
 * NB : path public (`/`), pas le path interne `/sortie`. Sur
 * sortie.colist.fr le proxy ré-écrit `/` → `/sortie`. Rediriger
 * vers `/sortie` causerait un double-rewrite `/sortie/sortie` et 404.
 */
export async function requireSortieAdmin() {
  const session = await getSortieAdminSession();
  if (!session) redirect("/");
  return session;
}
