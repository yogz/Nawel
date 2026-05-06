import { setRequestLocale } from "next-intl/server";
import { requireColistAdmin } from "@/features/admin/lib/require-colist-admin";

// Admin = données sensibles : on veut toujours du frais, jamais d'ISR.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Gate unique de toute la zone admin CoList — exécute auth + role +
  // 2FA enrollment + step-up. Les pages 2fa-enroll/2fa-challenge sont
  // exemptées du step-up via x-pathname (cf. `isStepUpExemptPath`).
  await requireColistAdmin(locale);
  return <>{children}</>;
}
