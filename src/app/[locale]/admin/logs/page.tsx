import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuditLogsAction } from "@/app/actions/audit-actions";
import { AdminHeader } from "@/components/admin/admin-header";
import { AuditLogList } from "@/components/admin/audit-log-list";
import { Shield } from "lucide-react";

import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage(props: { params: Promise<{ locale: string }> }) {
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

  const logs = await getAuditLogsAction({});

  return (
    <div className="min-h-screen bg-surface">
      <AdminHeader user={session.user} />
      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
              <Shield className="h-6 w-6 text-primary" />
              Journal d&apos;audit
            </h1>
            <p className="text-muted-foreground">Traçabilité des modifications de données</p>
          </div>
        </div>

        <AuditLogList initialLogs={logs} />
      </main>
    </div>
  );
}
