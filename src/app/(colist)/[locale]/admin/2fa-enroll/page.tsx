import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireColistAdmin } from "@/features/admin/lib/require-colist-admin";
import { TwoFactorEnroll } from "@/features/admin/components/two-factor-enroll";
import { hasPasswordCredential } from "@/features/admin/lib/has-password-credential";
import { safeAdminNext } from "@/features/admin/lib/admin-step-up";

export const metadata = {
  title: "Activer la 2FA",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Page admin FR-only comme le reste de /admin côté CoList — pas de
// useTranslations (cf. les autres pages admin existantes hardcodées FR).
export default async function ColistAdminTwoFactorEnrollPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireColistAdmin(locale);
  const { next } = await searchParams;
  // Empêche le re-enrollement silencieux : `twoFactor.enable()` régénère
  // un nouveau secret et écrase celui en DB → l'authenticator du user
  // continue de produire des codes pour l'ancien secret. Cas vu en prod
  // (cf. reset 2FA nicolas 2026-05-07). Pour reset, passer par
  // `scripts/admin/reset-2fa.ts`.
  if (session.user.twoFactorEnabled) {
    const challengeNext = safeAdminNext(next, `/${locale}/admin`);
    redirect(`/${locale}/admin/2fa-challenge?next=${encodeURIComponent(challengeNext)}`);
  }
  const hasPassword = await hasPasswordCredential(session.user.id);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <TwoFactorEnroll
        redirectAfter={safeAdminNext(next, `/${locale}/admin`)}
        hasPassword={hasPassword}
        userEmail={session.user.email}
      />
    </div>
  );
}
