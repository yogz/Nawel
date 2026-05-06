import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { TwoFactorEnroll } from "@/features/admin/components/two-factor-enroll";
import { hasPasswordCredential } from "@/features/admin/lib/has-password-credential";

export const metadata = {
  title: "Activer la 2FA",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ColistAdminTwoFactorEnrollPage({
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

  const hasPassword = await hasPasswordCredential(session.user.id);
  const { next } = await searchParams;
  const safeNext = next && next.startsWith(`/${locale}/admin`) ? next : `/${locale}/admin`;

  // Page admin FR-only comme le reste de /admin côté CoList — pas de
  // useTranslations (cf. les autres pages admin existantes hardcodées FR).
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <TwoFactorEnroll redirectAfter={safeNext} hasPassword={hasPassword} />
    </div>
  );
}
