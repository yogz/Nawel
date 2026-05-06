import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-config";
import { hasAdminStepUp } from "@/features/admin/lib/admin-step-up";

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

// Pages exemptées du gate step-up : enrollment + challenge doivent être
// joignables sans avoir déjà passé le step-up (sinon redirect-loop).
// Path interne après rewrite proxy : `/sortie/admin/...`. On vérifie
// aussi le path externe (sans `/sortie`) au cas où `x-pathname` serait
// absent (request directe sans proxy en dev).
function isStepUpExemptPath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  return pathname.includes("/admin/2fa-challenge") || pathname.includes("/admin/2fa-enroll");
}

/**
 * À utiliser dans les Server Components / layouts admin. Redirect
 * vers la home si non authentifié OU non-admin. Pas de message
 * d'erreur — on ne donne aucune info à un attaquant.
 *
 * Step-up TOTP : si l'admin a activé la 2FA, redirect vers le challenge
 * tant qu'aucun cookie `admin_stepup` valide n'est présent. Si pas
 * encore enrôlé, redirect vers `/admin/2fa-enroll` (forcé bloquant).
 *
 * NB : path public (`/`), pas le path interne `/sortie`. Sur
 * sortie.colist.fr le proxy ré-écrit `/` → `/sortie`. Rediriger
 * vers `/sortie` causerait un double-rewrite `/sortie/sortie` et 404.
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
  // Les pages 2fa-* assurent leur propre logique (enrôler / vérifier),
  // donc on ne re-déclenche pas un redirect step-up depuis le layout
  // qui les contient — sinon boucle infinie.
  if (isStepUpExemptPath(pathname)) {
    return session;
  }

  // L'admin doit d'abord enrôler une 2FA (forcé bloquant — pas de
  // grâce, pas de skip, cf. devil's advocate review).
  if (!session.user.twoFactorEnabled) {
    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    redirect(`/admin/2fa-enroll${next}`);
  }

  // 2FA enrôlée : exiger un step-up frais (TTL 30 min).
  const stepUpOk = await hasAdminStepUp(session.session.id);
  if (!stepUpOk) {
    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    redirect(`/admin/2fa-challenge${next}`);
  }

  return session;
}

/**
 * À utiliser dans les Server Actions admin (mutations). Throw si
 * non-admin OU si pas de step-up valide. Le layout admin protège la
 * vue ; chaque action doit re-vérifier — défense en profondeur.
 *
 * Magic-link / OAuth ne passent JAMAIS le step-up — seuls
 * `verifyTotp` ou `verifyBackupCode` posent le cookie `admin_stepup`.
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
