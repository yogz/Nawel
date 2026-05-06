import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth-config";
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

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "admin") {
    redirect(`/${locale}`);
  }
  if (!session.user.twoFactorEnabled) {
    redirect(`/${locale}/admin/2fa-enroll`);
  }

  const { next } = await searchParams;
  const safeNext = next && next.startsWith(`/${locale}/admin`) ? next : `/${locale}/admin`;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <TwoFactorChallenge next={safeNext} />
    </div>
  );
}
