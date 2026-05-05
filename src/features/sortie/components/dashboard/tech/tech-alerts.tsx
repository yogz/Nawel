import type {
  ParseAggregate,
  ServiceCallGroup,
  SweeperHealth,
} from "@/features/sortie/queries/stat-queries";
import type { WizardUmamiStats } from "@/features/sortie/queries/wizard-umami-stats";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

type Severity = "critical" | "warn";
type Alert = { id: string; severity: Severity; summary: string };

type Props = {
  sweeperHealth: SweeperHealth;
  parseAgg: ParseAggregate;
  services: ServiceCallGroup[];
  wizardUmami: WizardUmamiStats;
};

/**
 * Alertes auto-détectées côté `/admin/stat/tech`. Mêmes principes
 * que `<DashboardAlerts>` produit : conditionnel, disparaît dès que
 * la condition n'est plus vraie. Règles dérivées du §10.4.
 */
export function TechAlerts({ sweeperHealth, parseAgg, services, wizardUmami }: Props) {
  const alerts = computeAlerts({ sweeperHealth, parseAgg, services, wizardUmami });
  if (alerts.length === 0) {
    return null;
  }

  const sorted = [...alerts].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  return (
    <section>
      <header className="mb-4">
        <Eyebrow className="mb-2 text-erreur-500">─ alertes ─</Eyebrow>
        <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
          {sorted.length === 1 ? "1 alerte" : `${sorted.length} alertes`}
        </h2>
      </header>
      <ul className="flex flex-col gap-2">
        {sorted.map((a) => (
          <AlertRow key={a.id} alert={a} />
        ))}
      </ul>
    </section>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const isCritical = alert.severity === "critical";
  return (
    <li
      className={`flex items-baseline gap-3 rounded-xl border px-4 py-3 ${
        isCritical ? "border-erreur-500/40 bg-erreur-500/5" : "border-hot-500/30 bg-hot-500/5"
      }`}
    >
      <span
        aria-hidden
        className={`mt-1 size-1.5 shrink-0 rounded-full ${
          isCritical ? "animate-pulse bg-erreur-500" : "bg-hot-500"
        }`}
      />
      <div className="flex flex-1 flex-col gap-0.5">
        <span
          className={`font-mono text-[10.5px] uppercase tracking-[0.22em] ${
            isCritical ? "text-erreur-500" : "text-hot-500"
          }`}
        >
          {isCritical ? "critique" : "à surveiller"}
        </span>
        <span className="text-[13.5px] leading-snug text-ink-700">{alert.summary}</span>
      </div>
    </li>
  );
}

function severityRank(s: Severity): number {
  return s === "critical" ? 0 : 1;
}

function computeAlerts(props: Props): Alert[] {
  const out: Alert[] = [];

  // 1. Sweeper > 26h sans run = cron mort. Critique.
  const sweeperAge = props.sweeperHealth.lastRunAgeMs;
  if (sweeperAge !== null && sweeperAge > 26 * 60 * 60 * 1000) {
    const hours = Math.round(sweeperAge / (60 * 60 * 1000));
    out.push({
      id: "sweeper-stale",
      severity: "critical",
      summary: `Sweeper sans run depuis ${hours}h. Le cron daily Vercel ne déclenche plus — vérifier la config Crons et les Function Logs.`,
    });
  } else if (sweeperAge !== null && sweeperAge > 12 * 60 * 60 * 1000) {
    const hours = Math.round(sweeperAge / (60 * 60 * 1000));
    out.push({
      id: "sweeper-late",
      severity: "warn",
      summary: `Sweeper sans run depuis ${hours}h. Limite normale 24h ; à confirmer au prochain tick.`,
    });
  }

  // 1b. Erreurs sur la dernière run sweeper.
  const lastRun = props.sweeperHealth.lastRun;
  if (lastRun && lastRun.errorsCount > 0) {
    out.push({
      id: "sweeper-errors",
      severity: "warn",
      summary: `${lastRun.errorsCount} erreur${lastRun.errorsCount > 1 ? "s" : ""} sur la dernière run sweeper. Détail dans les Function Logs Vercel.`,
    });
  }

  // 2. Scraper OG : taux de succès < 50 % sur ≥ 10 tentatives = critique.
  if (props.parseAgg.totalAttempts >= 10) {
    const ratio = props.parseAgg.totalSuccess / props.parseAgg.totalAttempts;
    if (ratio < 0.5) {
      out.push({
        id: "scraper-low-success",
        severity: "critical",
        summary: `Scraper OG à ${Math.round(ratio * 100)} % de succès (${props.parseAgg.totalSuccess}/${props.parseAgg.totalAttempts}). Probable régression d'un site clé — voir le tableau hosts.`,
      });
    }
  }

  // 3. Échecs publish serveur ou réseau (réplique côté tech ; c'est
  //    un signal d'incident qui doit être visible des 2 côtés).
  const failed = props.wizardUmami.publishFailed;
  if (failed && failed.server + failed.network > 0) {
    const total = failed.server + failed.network;
    out.push({
      id: "publish-server-or-network-failure",
      severity: "critical",
      summary: `${total} publish ${total > 1 ? "ont échoué" : "a échoué"} côté serveur/réseau. Logs Vercel à investiguer immédiatement.`,
    });
  }

  // 4. Service externe en erreur récente < 24h.
  for (const service of props.services) {
    if (service.totalErrors > 0 && service.lastCalledAt) {
      const ageMs = Date.now() - service.lastCalledAt.getTime();
      if (ageMs < 24 * 60 * 60 * 1000) {
        out.push({
          id: `service-error-${service.service}`,
          severity: "warn",
          summary: `Service externe « ${service.service} » a ${service.totalErrors} erreur${service.totalErrors > 1 ? "s" : ""} récente${service.totalErrors > 1 ? "s" : ""} (< 24h). Voir l'onglet services.`,
        });
      }
    }
  }

  return out;
}
