import { requireSortieAdmin } from "@/features/sortie/lib/require-sortie-admin";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Admin = données sensibles : on veut toujours du frais, jamais d'ISR.
export const dynamic = "force-dynamic";

export default async function SortieAdminLayout({ children }: { children: React.ReactNode }) {
  // Gate unique de toute la zone — chaque server action admin doit
  // re-vérifier l'admin via `getSortieAdminSession()` (défense en profondeur).
  await requireSortieAdmin();
  return <>{children}</>;
}
