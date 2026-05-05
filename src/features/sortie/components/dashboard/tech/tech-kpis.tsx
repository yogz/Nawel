import type { ParseAggregate, SweeperHealth } from "@/features/sortie/queries/stat-queries";
import type { WizardUmamiStats } from "@/features/sortie/queries/wizard-umami-stats";
import {
  Kpi,
  type Tone,
  formatRelative,
} from "@/features/sortie/components/dashboard/dashboard-primitives";

type DeployInfo = {
  shortSha: string | null;
  commitMessage: string | null;
};

type Props = {
  parseAgg: ParseAggregate;
  sweeperHealth: SweeperHealth;
  wizardUmami: WizardUmamiStats;
  deploy: DeployInfo;
};

/**
 * 4 tuiles top-row pour `/admin/stat/tech`. Verdicts en ok/warn/critique
 * suivant les règles §10.4 du rapport audit. Chaque tuile reste lisible
 * indépendamment — l'agrégation en badge global vit dans `<TechHeader>`.
 *
 * Note Deploy : sans Vercel REST API (P2 du §10.3, token requis), on
 * affiche le commit courant via `VERCEL_GIT_COMMIT_*`. Si on est rendu,
 * le build a forcément réussi → tone "good" implicite.
 */
export function TechKpis({ parseAgg, sweeperHealth, wizardUmami, deploy }: Props) {
  const deployKpi = computeDeployKpi(deploy);
  const sweeperKpi = computeSweeperKpi(sweeperHealth);
  const scraperKpi = computeScraperKpi(parseAgg);
  const errorsKpi = computeErrorsKpi(wizardUmami);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Kpi label="Deploy" value={deployKpi.value} sub={deployKpi.sub} tone={deployKpi.tone} />
      <Kpi label="Sweeper" value={sweeperKpi.value} sub={sweeperKpi.sub} tone={sweeperKpi.tone} />
      <Kpi
        label="Scraper OG"
        value={scraperKpi.value}
        sub={scraperKpi.sub}
        tone={scraperKpi.tone}
      />
      <Kpi
        label="Échecs publish"
        value={errorsKpi.value}
        sub={errorsKpi.sub}
        tone={errorsKpi.tone}
      />
    </div>
  );
}

type KpiOutput = { value: string; sub: string; tone: Tone };

function computeDeployKpi(deploy: DeployInfo): KpiOutput {
  if (!deploy.shortSha) {
    return {
      value: "—",
      sub: "VERCEL_GIT_COMMIT_SHA absent (dev local ?)",
      tone: "muted",
    };
  }
  const message = deploy.commitMessage ? truncate(deploy.commitMessage, 36) : "—";
  return {
    value: deploy.shortSha,
    // Si on rend cette page, le build courant a forcément réussi —
    // tone "good" implicite. Pour suivre les échecs/rollbacks au-delà,
    // il faut l'API Vercel (P2 du §10.3).
    sub: message,
    tone: "good",
  };
}

function computeSweeperKpi(health: SweeperHealth): KpiOutput {
  const { lastRun, lastRunAgeMs } = health;
  if (!lastRun || lastRunAgeMs === null) {
    return {
      value: "—",
      sub: "Aucune run enregistrée — déploiement < 24h ?",
      tone: "muted",
    };
  }
  const ageHours = lastRunAgeMs / (1000 * 60 * 60);
  let tone: Tone = "good";
  if (ageHours > 26) {
    tone = "bad";
  } else if (ageHours > 12) {
    tone = "warn";
  }
  // Erreurs > 0 sur la dernière run → warn même si l'âge est OK.
  if (lastRun.errorsCount > 0 && tone === "good") {
    tone = "warn";
  }
  return {
    value: formatRelative(lastRun.startedAt),
    sub:
      lastRun.errorsCount > 0
        ? `${lastRun.errorsCount} erreur${lastRun.errorsCount > 1 ? "s" : ""} · ${lastRun.durationMs ?? "?"} ms`
        : `${lastRun.durationMs ?? "?"} ms`,
    tone,
  };
}

function computeScraperKpi(parseAgg: ParseAggregate): KpiOutput {
  if (parseAgg.totalAttempts === 0) {
    return { value: "—", sub: "Aucune tentative scraper", tone: "muted" };
  }
  const ratio = parseAgg.totalSuccess / parseAgg.totalAttempts;
  let tone: Tone = "good";
  if (parseAgg.totalAttempts >= 10) {
    if (ratio < 0.5) {
      tone = "bad";
    } else if (ratio < 0.7) {
      tone = "warn";
    }
  }
  return {
    value: `${Math.round(ratio * 100)} %`,
    sub: `${parseAgg.totalSuccess.toLocaleString("fr-FR")} succès / ${parseAgg.totalAttempts.toLocaleString("fr-FR")} tentatives`,
    tone,
  };
}

function computeErrorsKpi(wizardUmami: WizardUmamiStats): KpiOutput {
  const failed = wizardUmami.publishFailed;
  if (!failed) {
    return { value: "—", sub: "Lecture Umami indispo", tone: "muted" };
  }
  const critical = failed.server + failed.network;
  let tone: Tone = "good";
  if (critical >= 3) {
    tone = "bad";
  } else if (critical >= 1) {
    tone = "warn";
  }
  return {
    value: String(critical),
    sub:
      critical === 0
        ? `${failed.validation} validation${failed.validation > 1 ? "s" : ""}`
        : `${failed.server} server · ${failed.network} network`,
    tone,
  };
}

function truncate(s: string, max: number): string {
  if (s.length <= max) {
    return s;
  }
  return s.slice(0, max - 1) + "…";
}
