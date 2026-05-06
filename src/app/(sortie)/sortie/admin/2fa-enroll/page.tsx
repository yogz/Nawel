import { requireSortieAdmin } from "@/features/sortie/lib/require-sortie-admin";
import { TwoFactorEnroll } from "@/features/admin/components/two-factor-enroll";
import { hasPasswordCredential } from "@/features/admin/lib/has-password-credential";

export const metadata = {
  title: "Activer la 2FA",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SortieAdminTwoFactorEnrollPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await requireSortieAdmin();
  const hasPassword = await hasPasswordCredential(session.user.id);
  const { next } = await searchParams;
  // Whitelist : on ne redirige que vers `/admin*` pour éviter
  // open-redirect via `?next=https://evil.example`. Sur sortie.colist.fr
  // le proxy rewrite `/admin/...` → `/sortie/admin/...`, donc le path
  // externe reste `/admin/...`.
  const safeNext = next && next.startsWith("/admin") ? next : "/admin";
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <TwoFactorEnroll redirectAfter={safeNext} hasPassword={hasPassword} />
    </div>
  );
}
