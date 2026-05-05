import type {
  CreatorActivation28d,
  OutingsPerDay,
  ServiceCallGroup,
} from "@/features/sortie/queries/stat-queries";
import type { WizardUmamiStats } from "@/features/sortie/queries/wizard-umami-stats";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { Kpi } from "@/features/sortie/components/dashboard/dashboard-primitives";
import { DashboardKpis } from "@/features/sortie/components/dashboard/dashboard-kpis";
import { DashboardAlerts } from "@/features/sortie/components/dashboard/dashboard-alerts";
import { DashboardOpportunities } from "@/features/sortie/components/dashboard/dashboard-opportunities";
import { DashboardWizardDetails } from "@/features/sortie/components/dashboard/dashboard-wizard-details";
import { DashboardOutingDetails } from "@/features/sortie/components/dashboard/dashboard-outing-details";
import { DashboardAuthDetails } from "@/features/sortie/components/dashboard/dashboard-auth-details";
import { DashboardTabs } from "@/features/sortie/components/dashboard/dashboard-tabs";

type TabKey = "wizard" | "outing" | "auth";

type Props = {
  services: ServiceCallGroup[];
  outingsPerDay: OutingsPerDay[];
  wizardUmami: WizardUmamiStats;
  creatorActivation: CreatorActivation28d;
  currentTab: TabKey;
};

const DAY_LABEL_FMT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
});

/**
 * Remplit les 7 derniers jours (incluant aujourd'hui, en heure Paris)
 * avec des zéros pour les jours sans sortie. La query DB ne retourne
 * que les jours avec ≥1 sortie ; on a besoin d'une série dense pour
 * afficher 7 colonnes alignées.
 */
function fill7Days(rows: OutingsPerDay[]): OutingsPerDay[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const today = new Date();
  // Aligne sur Paris en formattant + reparsant. Plus robuste qu'une
  // arithmétique sur Date côté JS qui prendrait l'heure machine.
  const isoFmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const out: OutingsPerDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const day = isoFmt.format(d);
    out.push(byDay.get(day) ?? { day, totalCount: 0, activeCount: 0 });
  }
  return out;
}

/**
 * Orchestrateur du dashboard `/admin/stat` après refonte (PR1-PR3) :
 *   - Top-row 4 KPIs nord (toujours visible)
 *   - Alertes auto-détectées (conditionnel)
 *   - Opportunités (conditionnel)
 *   - Sorties créées 7j (DB-driven, top-level pour toute audience)
 *   - Tabs Wizard / Outing / Auth pour le détail (PR3)
 *
 * Toute la logique métier vit dans les sous-composants — ce fichier
 * reste un assemblage déclaratif < 150 LOC.
 */
export function StatDashboard({
  services,
  outingsPerDay,
  wizardUmami,
  creatorActivation,
  currentTab,
}: Props) {
  const days = fill7Days(outingsPerDay);
  const totalCreated7d = days.reduce((sum, d) => sum + d.totalCount, 0);
  const totalActive7d = days.reduce((sum, d) => sum + d.activeCount, 0);
  // Hauteur max pour normaliser les barres : 1 minimum pour que l'axe
  // ne soit pas écrasé même quand toutes les valeurs sont 0.
  const maxCount = Math.max(1, ...days.map((d) => d.totalCount));

  return (
    <div className="flex flex-col gap-12">
      {/* === Top-row : 4 KPIs nord (PR1) === */}
      <DashboardKpis
        outingsPerDay={outingsPerDay}
        wizardUmami={wizardUmami}
        creatorActivation={creatorActivation}
      />

      {/* === Alertes auto-détectées (PR2) — n'apparaît que si règle déclenche === */}
      <DashboardAlerts wizardUmami={wizardUmami} services={services} />

      {/* === Opportunités : segments sous-performants (PR2) === */}
      <DashboardOpportunities wizardUmami={wizardUmami} />

      {/* === Sorties créées (vue produit, top-level) === */}
      <section>
        <header className="mb-4">
          <Eyebrow className="mb-2">─ création sorties ─</Eyebrow>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
            Sorties créées (7 derniers jours)
          </h2>
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            label="Total 7j"
            value={totalCreated7d.toLocaleString("fr-FR")}
            sub={`${totalActive7d.toLocaleString("fr-FR")} actives`}
          />
          <div className="col-span-2 flex flex-col gap-1 rounded-xl border border-surface-400 bg-surface-100 p-4 sm:col-span-3">
            <Eyebrow tone="muted">Par jour</Eyebrow>
            <div className="mt-1 flex h-24 items-end gap-2">
              {days.map((d) => {
                const height = (d.totalCount / maxCount) * 100;
                const cancelled = d.totalCount - d.activeCount;
                const cancelledRatio = d.totalCount > 0 ? cancelled / d.totalCount : 0;
                return (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <div className="relative flex h-full w-full items-end overflow-hidden rounded-md bg-surface-200">
                      {d.totalCount > 0 && (
                        <div
                          className="w-full bg-acid-600"
                          style={{ height: `${Math.max(8, height)}%` }}
                          aria-label={`${d.totalCount} sortie${d.totalCount > 1 ? "s" : ""}`}
                        >
                          {cancelledRatio > 0 && (
                            <div
                              className="w-full bg-rose-400/70"
                              style={{ height: `${cancelledRatio * 100}%` }}
                              title={`${cancelled} cancelled`}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-[10px] tabular-nums text-ink-500">
                      {DAY_LABEL_FMT.format(new Date(`${d.day}T12:00:00`))}
                    </span>
                    <span className="font-mono text-[11px] font-bold tabular-nums text-ink-700">
                      {d.totalCount}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* === Détails par domaine en tabs (PR3) === */}
      <DashboardTabs
        current={currentTab}
        wizard={<DashboardWizardDetails wizardUmami={wizardUmami} />}
        outing={<DashboardOutingDetails wizardUmami={wizardUmami} />}
        auth={<DashboardAuthDetails wizardUmami={wizardUmami} />}
      />
    </div>
  );
}
