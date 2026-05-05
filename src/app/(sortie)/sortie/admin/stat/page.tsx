import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getCreatorActivation28d,
  getHostBreakdown,
  getOutingsCreatedPerDay,
  getParseAggregate,
  getServiceCallStats,
} from "@/features/sortie/queries/stat-queries";
import { getWizardUmamiStats } from "@/features/sortie/queries/wizard-umami-stats";
import { StatDashboard } from "@/features/sortie/components/stat-dashboard";
import { StatRangePicker } from "@/features/sortie/components/stat-range-picker";
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

// Élargi à 28j et 90j (2026-05-05) pour le KPI activation créateur §9.2
// du rapport audit, qui demande une fenêtre stable long-terme. 30j retiré
// pour éviter une 5ᵉ option qui dilue le picker (UX agent : <5 ranges).
const ALLOWED_RANGES = new Set([1, 7, 28, 90]);

function parseRange(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  return ALLOWED_RANGES.has(n) ? n : 7;
}

type Props = {
  searchParams: Promise<{ range?: string }>;
};

export default async function StatPage({ searchParams }: Props) {
  // Auth gate délégué au layout `/sortie/admin/layout.tsx` (un seul endroit).
  const { range: rawRange } = await searchParams;
  const rangeDays = parseRange(rawRange);

  const [parseAgg, services, hosts, outingsPerDay, wizardUmami, creatorActivation] =
    await Promise.all([
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
      safe("getWizardUmamiStats", () => getWizardUmamiStats(rangeDays), {
        configured: false,
        rangeDays,
        siteStats: null,
        activeVisitors: null,
        funnel: null,
        pasteToPublish: null,
        pasteToPublishBuckets: null,
        geminiTriggers: null,
        pasteKind: null,
        confirmEntered: null,
        outingFunnel: null,
        shareChannels: null,
        rsvpBreakdown: null,
        publishFailed: null,
        abandonedSteps: null,
        outingViewedSources: null,
        topReferrers: null,
        topPaths: null,
      }),
      safe("getCreatorActivation28d", getCreatorActivation28d, {
        totalCreators: 0,
        activatedCreators: 0,
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

      <header className="mb-12 flex flex-col gap-6">
        <div>
          <Eyebrow glow className="mb-3">
            ─ supervision ─
          </Eyebrow>
          <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-6xl">
            Stats
          </h1>
          <p className="mt-4 text-[15px] text-ink-500">
            Audience Umami, funnel wizard, page sortie publique, scraper d&apos;URL et services
            externes (Gemini, Discovery API). Toutes les sections Umami suivent la fenêtre
            sélectionnée et comparent à la période précédente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatRangePicker current={rangeDays} />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
            fenêtre Umami
          </span>
        </div>
      </header>

      <StatDashboard
        parseAgg={parseAgg}
        services={services}
        hosts={hosts}
        outingsPerDay={outingsPerDay}
        wizardUmami={wizardUmami}
        creatorActivation={creatorActivation}
      />
    </main>
  );
}
