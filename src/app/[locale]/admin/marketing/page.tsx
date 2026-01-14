import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { setRequestLocale } from "next-intl/server";
import { Megaphone } from "lucide-react";
import { MarketingContext } from "@/components/admin/marketing/marketing-context";
import { MarketingFoundations } from "@/components/admin/marketing/marketing-foundations";
import { MarketingPLG } from "@/components/admin/marketing/marketing-plg";
import { MarketingAcquisition } from "@/components/admin/marketing/marketing-acquisition";
import { MarketingContentStrategy } from "@/components/admin/marketing/marketing-content-strategy";
import { MarketingPartnerships } from "@/components/admin/marketing/marketing-partnerships";
import { MarketingMetrics } from "@/components/admin/marketing/marketing-metrics";
import { MarketingBudget } from "@/components/admin/marketing/marketing-budget";
import { MarketingRisks } from "@/components/admin/marketing/marketing-risks";

import { MarketingInstagramPosts } from "@/components/admin/marketing/marketing-instagram-posts";

export const dynamic = "force-dynamic";

export default async function MarketingPlanPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-4">
        <div className="rounded-2xl border border-white/20 bg-white/80 p-8 text-center shadow-lg backdrop-blur-sm">
          <h1 className="mb-2 text-xl font-bold text-red-600">Accès refusé</h1>
          <p className="text-muted-foreground">Vous n&apos;avez pas les droits administrateur.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <AdminHeader user={session.user} />
      <main className="mx-auto max-w-6xl p-4 sm:p-6 pb-20 space-y-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-text">Plan Marketing Global (12 Mois)</h1>
          </div>
          <p className="text-muted-foreground">
            Feuille de route stratégique pour l&apos;acquisition et la croissance de CoList.
          </p>
        </div>

        <MarketingContext />
        <MarketingFoundations />
        <MarketingPLG />
        <MarketingAcquisition />
        <MarketingContentStrategy />
        <MarketingInstagramPosts />
        <MarketingPartnerships />
        <MarketingMetrics />
        <MarketingBudget />
        <MarketingRisks />
      </main>
    </div>
  );
}
