import { redirect } from "next/navigation";
import { requireSortieAdmin } from "@/features/sortie/lib/require-sortie-admin";
import { safeAdminNext } from "@/features/admin/lib/admin-step-up";
import { TwoFactorChallenge } from "@/features/admin/components/two-factor-challenge";

export const metadata = {
  title: "Vérification 2FA",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SortieAdminTwoFactorChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Le gate exempte les paths 2fa-* du step-up check (sinon boucle), mais
  // valide quand même session + role admin et nous renvoie la session.
  const session = await requireSortieAdmin();
  if (!session.user.twoFactorEnabled) {
    redirect("/admin/2fa-enroll");
  }
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <TwoFactorChallenge next={safeAdminNext(next, "/admin")} />
    </div>
  );
}
