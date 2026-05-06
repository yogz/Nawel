import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-config";
import { hasAdminStepUp, isStepUpExemptPath } from "@/features/admin/lib/admin-step-up";

// `role` vit sur la table `user` (default "user"), promu via le plugin
// admin de Better Auth (`adminRoles: ["admin"]` dans auth-config). Un
// admin côté `(colist)` est admin partout — cookies sur `.colist.fr`.

export async function getSortieAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return null;
  }
  if (session.user.role !== "admin") {
    return null;
  }
  return session;
}

/**
 * Gate Server Component. Redirect vers `/` si non admin (pas de message,
 * pas d'info pour l'attaquant). Si admin sans 2FA → /admin/2fa-enroll
 * (bloquant). Si admin avec 2FA mais sans step-up frais → /admin/2fa-challenge.
 *
 * NB : redirect vers `/` (path public Sortie), pas vers `/sortie`. Le
 * proxy rewrite `/` → `/sortie` ; rediriger sur `/sortie` causerait un
 * double-rewrite `/sortie/sortie` et 404.
 */
export async function requireSortieAdmin() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) {
    redirect("/");
  }
  if (session.user.role !== "admin") {
    redirect("/");
  }

  const pathname = h.get("x-pathname");
  // Les pages 2fa-* font leur propre logique d'enrôlement / vérif :
  // les exempter ici évite la boucle "layout redirect → page redirect".
  if (isStepUpExemptPath(pathname)) {
    return session;
  }

  // Enrollment forcé bloquant : pas de grâce ni de skip — sans 2FA,
  // l'admin ne peut accéder à aucune page admin sauf l'enrôlement
  // lui-même (exempté plus haut via `isStepUpExemptPath`).
  if (!session.user.twoFactorEnabled) {
    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    redirect(`/admin/2fa-enroll${next}`);
  }

  const stepUpOk = await hasAdminStepUp(session.session.id);
  if (!stepUpOk) {
    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    redirect(`/admin/2fa-challenge${next}`);
  }

  return session;
}

/**
 * Gate server action (mutation). Throw si non-admin OU step-up absent.
 *
 * Magic-link et OAuth ne posent JAMAIS le cookie step-up : seules
 * `verifyTotp` / `verifyBackupCode` peuvent le poser. Conséquence : un
 * attaquant qui détourne un magic-link n'obtient pas l'élévation admin.
 */
export async function assertSortieAdmin() {
  const session = await getSortieAdminSession();
  if (!session) {
    throw new Error("Accès refusé");
  }
  if (!session.user.twoFactorEnabled) {
    throw new Error("2FA admin non enrôlée");
  }
  const stepUpOk = await hasAdminStepUp(session.session.id);
  if (!stepUpOk) {
    throw new Error("Step-up 2FA requis");
  }
  return session;
}
