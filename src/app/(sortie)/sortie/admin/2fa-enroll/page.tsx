import { requireSortieAdmin } from "@/features/sortie/lib/require-sortie-admin";
import { TwoFactorEnroll } from "@/features/admin/components/two-factor-enroll";

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
  await requireSortieAdmin();
  const { next } = await searchParams;
  // Whitelist : on ne redirige que vers `/sortie/admin*` pour éviter
  // open-redirect via `?next=https://evil.example`.
  const safeNext = next && next.startsWith("/sortie/admin") ? next : "/sortie/admin";
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <TwoFactorEnroll redirectAfter={safeNext} />
    </div>
  );
}
