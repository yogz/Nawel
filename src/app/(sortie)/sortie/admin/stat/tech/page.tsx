import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getDbSizes,
  getHostBreakdown,
  getOrphansCounts,
  getParseAggregate,
  getServiceCallStats,
  getSweeperHealth,
} from "@/features/sortie/queries/stat-queries";
import { getWizardUmamiStats } from "@/features/sortie/queries/wizard-umami-stats";
import { logger } from "@/lib/logger";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { TechKpis } from "@/features/sortie/components/dashboard/tech/tech-kpis";
import { TechAlerts } from "@/features/sortie/components/dashboard/tech/tech-alerts";
import { TechServices } from "@/features/sortie/components/dashboard/tech/tech-services";
import { TechScraper } from "@/features/sortie/components/dashboard/tech/tech-scraper";
import { TechDb } from "@/features/sortie/components/dashboard/tech/tech-db";

// Idem `/admin/stat` : on wrap chaque query pour qu'une erreur SQL ne
// casse pas tout le tech dashboard. Particulièrement important ici car
// `pg_total_relation_size` peut être bloqué selon les permissions.
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.warn(`[stat-tech-page] ${label} failed`, {
      message: err instanceof Error ? err.message : "unknown",
    });
    return fallback;
  }
}

export const metadata = {
  title: "Supervision tech — admin",
  robots: { index: false, follow: false },
};

// Tech = données très sensibles, jamais cache. Le layout `/admin` impose
// déjà `force-dynamic` mais on le re-déclare ici pour clarté.
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ range?: string }>;
};

export default async function StatTechPage({ searchParams }: Props) {
  // Auth admin gate délégué au layout `(sortie)/sortie/admin/layout.tsx`.
  // Range pour la fenêtre Umami (publishFailed surtout). 24h par défaut
  // côté tech : on veut savoir l'état frais, pas l'historique.
  const { range: rawRange } = await searchParams;
  const rangeDays = parseRange(rawRange);

  const [parseAgg, services, hosts, sweeperHealth, dbSizes, orphans, wizardUmami] =
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
      safe("getSweeperHealth", getSweeperHealth, {
        lastRun: null,
        lastRunAgeMs: null,
        recentRuns: [],
      }),
      safe("getDbSizes", getDbSizes, []),
      safe("getOrphansCounts", getOrphansCounts, {
        staleAnonymousParticipants: 0,
        expiredMagicLinks: 0,
        expiredSessions: 0,
      }),
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
        wizardDevice: null,
        outingViewedDevice: null,
        topReferrers: null,
        topPaths: null,
      }),
    ]);

  // Deploy info — sans Vercel API token on lit ce que Next.js expose
  // côté env (cf. `https://vercel.com/docs/projects/environment-variables/system-environment-variables`).
  // Si on rend cette page, c'est que ce build a réussi → tone "good"
  // implicite côté KPI.
  const deploy = {
    shortSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
  };

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href="/admin/stat"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          stats produit
        </Link>
      </nav>

      <header className="mb-12 flex flex-col gap-6">
        <div>
          <Eyebrow glow className="mb-3">
            ─ supervision tech ─
          </Eyebrow>
          <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-6xl">
            Tech
          </h1>
          <p className="mt-4 text-[15px] text-ink-500">
            Santé technique du site : déploiements, sweeper, scraper OG, services externes, tables
            Postgres et orphelins purgeables. Page binaire ça-marche / ça-marche-pas — les
            opportunités produit vivent sur la page{" "}
            <Link href="/admin/stat" className="underline-offset-2 hover:underline">
              stats
            </Link>
            .
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-12">
        <TechKpis
          parseAgg={parseAgg}
          sweeperHealth={sweeperHealth}
          wizardUmami={wizardUmami}
          deploy={deploy}
        />

        <TechAlerts
          sweeperHealth={sweeperHealth}
          parseAgg={parseAgg}
          services={services}
          wizardUmami={wizardUmami}
        />

        <TechDb dbSizes={dbSizes} orphans={orphans} sweeperHealth={sweeperHealth} />

        <TechServices services={services} />

        <TechScraper parseAgg={parseAgg} hosts={hosts} />
      </div>
    </main>
  );
}

const ALLOWED_RANGES = new Set([1, 7]);

function parseRange(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  return ALLOWED_RANGES.has(n) ? n : 1;
}
