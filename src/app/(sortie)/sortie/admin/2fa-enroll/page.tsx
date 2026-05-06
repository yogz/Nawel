import { requireSortieAdmin } from "@/features/sortie/lib/require-sortie-admin";
import { TwoFactorEnroll } from "@/features/admin/components/two-factor-enroll";
import { hasPasswordCredential } from "@/features/admin/lib/has-password-credential";
import { safeAdminNext } from "@/features/admin/lib/admin-step-up";

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
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <TwoFactorEnroll redirectAfter={safeAdminNext(next, "/admin")} hasPassword={hasPassword} />
    </div>
  );
}
