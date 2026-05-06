import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-config";
import { hasAdminStepUp } from "@/features/admin/lib/admin-step-up";

// Pendant CoList du `requireSortieAdmin` Sortie. Différence : URL
// localisée `/[locale]/admin/...`, donc redirects retournent vers
// `/<locale>` (root localisé) plutôt que `/`.

function isStepUpExemptPath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  return pathname.includes("/admin/2fa-challenge") || pathname.includes("/admin/2fa-enroll");
}

export async function requireColistAdmin(locale: string) {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) {
    redirect(`/${locale}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const pathname = h.get("x-pathname");
  if (isStepUpExemptPath(pathname)) {
    return session;
  }

  if (!session.user.twoFactorEnabled) {
    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    redirect(`/${locale}/admin/2fa-enroll${next}`);
  }

  const stepUpOk = await hasAdminStepUp(session.session.id);
  if (!stepUpOk) {
    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    redirect(`/${locale}/admin/2fa-challenge${next}`);
  }

  return session;
}
