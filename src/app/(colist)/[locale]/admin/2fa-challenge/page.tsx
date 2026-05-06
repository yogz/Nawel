import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireColistAdmin } from "@/features/admin/lib/require-colist-admin";
import { safeAdminNext } from "@/features/admin/lib/admin-step-up";
import { TwoFactorChallenge } from "@/features/admin/components/two-factor-challenge";

export const metadata = {
  title: "Vérification 2FA",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ColistAdminTwoFactorChallengePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireColistAdmin(locale);
  if (!session.user.twoFactorEnabled) {
    redirect(`/${locale}/admin/2fa-enroll`);
  }
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <TwoFactorChallenge next={safeAdminNext(next, `/${locale}/admin`)} />
    </div>
  );
}
