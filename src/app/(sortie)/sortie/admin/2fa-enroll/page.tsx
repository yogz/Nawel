import { redirect } from "next/navigation";
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
  const { next } = await searchParams;
  // Empêche le re-enrollement silencieux : `twoFactor.enable()` régénère
  // un nouveau secret et écrase celui en DB → l'authenticator du user
  // continue de produire des codes pour l'ancien secret. Cas vu en prod
  // (cf. reset 2FA nicolas 2026-05-07). Pour reset, passer par
  // `scripts/admin/reset-2fa.ts`.
  if (session.user.twoFactorEnabled) {
    const challengeNext = safeAdminNext(next, "/admin");
    redirect(`/admin/2fa-challenge?next=${encodeURIComponent(challengeNext)}`);
  }
  const hasPassword = await hasPasswordCredential(session.user.id);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <TwoFactorEnroll
        redirectAfter={safeAdminNext(next, "/admin")}
        hasPassword={hasPassword}
        userEmail={session.user.email}
      />
    </div>
  );
}
