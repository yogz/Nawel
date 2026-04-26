import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth-config";
import {
  getHostBreakdown,
  getParseAggregate,
  getServiceCallStats,
} from "@/features/sortie/queries/stat-queries";
import { StatDashboard } from "@/features/sortie/components/stat-dashboard";

export const metadata = {
  title: "Supervision",
  robots: { index: false, follow: false },
};

// Server-side, pas de cache : le dashboard veut refléter l'état réel
// de la télémétrie au moment du chargement, pas un snapshot ISR.
export const dynamic = "force-dynamic";

export default async function StatPage() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  // Restreint aux utilisateurs connectés (Better Auth). Les anonymes
  // sortie qui passent par cookie token n'y ont pas accès — le
  // tracking IP-hashé du parser n'est pas une donnée à exposer
  // largement.
  if (!session?.user) {
    redirect("/sortie");
  }

  const [parseAgg, services, hosts] = await Promise.all([
    getParseAggregate(),
    getServiceCallStats(),
    getHostBreakdown(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href="/sortie"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-encre-400 transition-colors hover:bg-ivoire-100 hover:text-bordeaux-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          accueil
        </Link>
      </nav>

      <header className="mb-12">
        <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-bordeaux-600 shadow-[0_0_12px_var(--sortie-acid)]"
          />
          ─ supervision ─
        </p>
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-encre-700 sm:text-6xl">
          Stats
        </h1>
        <p className="mt-4 text-[15px] text-encre-500">
          Compteurs vie du scraper d&apos;URL et des services externes (Gemini, Discovery API
          Ticketmaster).
        </p>
      </header>

      <StatDashboard parseAgg={parseAgg} services={services} hosts={hosts} />
    </main>
  );
}
