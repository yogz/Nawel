import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCostsAction } from "@/app/actions/admin-actions";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminCostList } from "@/components/admin/admin-cost-list";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AdminCostsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    redirect("/login");
  }

  const costs = await getCostsAction();

  return (
    <div className="min-h-screen bg-surface">
      <AdminHeader user={session.user} />
      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">Gestion des coûts</h1>
            <p className="text-muted-foreground">Suivi des dépenses et de la transparence</p>
          </div>
        </div>
        <Suspense fallback={<div>Chargement des coûts...</div>}>
          <AdminCostList initialCosts={costs} />
        </Suspense>
      </main>
    </div>
  );
}
