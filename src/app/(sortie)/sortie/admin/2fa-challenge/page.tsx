import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-config";
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
  // Gate light : on exige juste un user admin loggué — le step-up est
  // précisément ce que cette page sert à obtenir, donc ne pas l'exiger
  // ici (sinon redirect-loop). `requireSortieAdmin()` exempte d'ailleurs
  // ce path via `isStepUpExemptPath`, mais on a besoin d'une garde
  // explicite ici pour les non-admins qui tomberaient sur l'URL.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }
  if (!session.user.twoFactorEnabled) {
    // Pas encore enrôlé : on ne peut pas faire de challenge.
    redirect("/admin/2fa-enroll");
  }

  const { next } = await searchParams;
  // Whitelist : seulement les paths internes admin Sortie (proxy rewrite
  // `/admin/...` → `/sortie/admin/...`). Path externe = ce qu'on lit dans
  // x-pathname côté Sortie host.
  const safeNext = next && next.startsWith("/admin") ? next : "/admin";

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <TwoFactorChallenge next={safeNext} />
    </div>
  );
}
