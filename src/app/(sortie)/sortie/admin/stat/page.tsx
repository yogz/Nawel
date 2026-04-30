import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getHostBreakdown,
  getOutingsCreatedPerDay,
  getParseAggregate,
  getServiceCallStats,
} from "@/features/sortie/queries/stat-queries";
import { getWizardUmamiStats } from "@/features/sortie/queries/wizard-umami-stats";
import { StatDashboard } from "@/features/sortie/components/stat-dashboard";
import { logger } from "@/lib/logger";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

// Une query qui plante ne doit pas casser tout le dashboard. On les
// wrap individuellement et on retombe sur un défaut vide en cas
// d'erreur SQL / Umami down / fuseau bizarre.
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.warn(`[stat-page] ${label} failed`, {
      message: err instanceof Error ? err.message : "unknown",
    });
    return fallback;
  }
}

export const metadata = {
  title: "Stats — admin",
  robots: { index: false, follow: false },
};

export default async function StatPage() {
  // Auth gate délégué au layout `/sortie/admin/layout.tsx` (un seul endroit).
  const [parseAgg, services, hosts, outingsPerDay, wizardUmami] = await Promise.all([
    safe("getParseAggregate", getParseAggregate, {
      totalAttempts: 0,
      totalSuccess: 0,
      totalImageFound: 0,
      totalZeroData: 0,
      totalFetchError: 0,
      hostCount: 0,
    }),
    safe("getServiceCallStats", getServiceCallStats, []),
    safe("getHostBreakdown", () => getHostBreakdown(), []),
    safe("getOutingsCreatedPerDay", getOutingsCreatedPerDay, []),
    safe("getWizardUmamiStats", () => getWizardUmamiStats(), {
      configured: false,
      rangeDays: 7,
      funnel: null,
      pasteToPublish: null,
      geminiTriggers: null,
      pasteKind: null,
      confirmEntered: null,
    }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href="/admin"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          admin
        </Link>
      </nav>

      <header className="mb-12">
        <Eyebrow glow className="mb-3">
          ─ supervision ─
        </Eyebrow>
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-6xl">
          Stats
        </h1>
        <p className="mt-4 text-[15px] text-ink-500">
          Compteurs vie du scraper d&apos;URL et des services externes (Gemini, Discovery API
          Ticketmaster).
        </p>
      </header>

      <StatDashboard
        parseAgg={parseAgg}
        services={services}
        hosts={hosts}
        outingsPerDay={outingsPerDay}
        wizardUmami={wizardUmami}
      />
    </main>
  );
}
