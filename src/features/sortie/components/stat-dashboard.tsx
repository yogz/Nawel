import type {
  CreatorActivation28d,
  HostStat,
  OutingsPerDay,
  ParseAggregate,
  ServiceCallGroup,
} from "@/features/sortie/queries/stat-queries";
import type { WizardUmamiStats } from "@/features/sortie/queries/wizard-umami-stats";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import {
  DATE_FMT,
  Kpi,
  MetricList,
  type Tone,
  deltaLabel,
  formatRelative,
  pct,
  toneClass,
} from "@/features/sortie/components/dashboard/dashboard-primitives";
import { DashboardKpis } from "@/features/sortie/components/dashboard/dashboard-kpis";
import { DashboardAlerts } from "@/features/sortie/components/dashboard/dashboard-alerts";
import { DashboardOpportunities } from "@/features/sortie/components/dashboard/dashboard-opportunities";

type Props = {
  parseAgg: ParseAggregate;
  services: ServiceCallGroup[];
  hosts: HostStat[];
  outingsPerDay: OutingsPerDay[];
  wizardUmami: WizardUmamiStats;
  creatorActivation: CreatorActivation28d;
};

const STEP_SHORT_LABEL: Record<string, string> = {
  wizard_step_paste_entered: "paste",
  wizard_paste_submitted: "submit",
  wizard_step_date_entered: "date",
  wizard_step_commit_entered: "commit",
  wizard_publish_succeeded: "publish",
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

function rateColor(rate: number): string {
  if (rate >= 0.8) {
    return "text-emerald-700";
  }
  if (rate >= 0.5) {
    return "text-amber-700";
  }
  return "text-rose-700";
}

function failureKindLabel(kind: string | null): string {
  switch (kind) {
    case "fetch_error":
      return "fetch ko";
    case "zero_data":
      return "page vide";
    case "blocked_waf":
      return "anti-bot";
    case "success":
      return "—";
    default:
      return kind ?? "—";
  }
}

export function StatDashboard({
  parseAgg,
  services,
  hosts,
  outingsPerDay,
  wizardUmami,
  creatorActivation,
}: Props) {
  const problemHosts = hosts
    .filter((h) => h.attempts >= 5 && h.successCount / h.attempts < 0.5)
    .slice(0, 10);

  const days = fill7Days(outingsPerDay);
  const totalCreated7d = days.reduce((sum, d) => sum + d.totalCount, 0);
  const totalActive7d = days.reduce((sum, d) => sum + d.activeCount, 0);
  // Hauteur max pour normaliser les barres : 1 minimum pour que l'axe
  // ne soit pas écrasé même quand toutes les valeurs sont 0.
  const maxCount = Math.max(1, ...days.map((d) => d.totalCount));

  // Funnel max pour échelle visuelle. Le 1er step (paste) est le
  // dénominateur naturel des % de conversion ; en cas de 0 paste on
  // évite une division par zéro qui afficherait NaN.
  const funnelTopCount = wizardUmami.funnel?.[0]?.count ?? 0;
  const funnelLastCount = wizardUmami.funnel?.[wizardUmami.funnel.length - 1]?.count ?? 0;

  // Alerte funnel cassé : si on a >5 entrées paste mais 0 publish dans
  // la fenêtre, c'est un signal fort qu'un blocage technique a cassé
  // la conversion (validation serveur, formulaire en erreur, etc.).
  const funnelBroken = wizardUmami.funnel !== null && funnelTopCount >= 5 && funnelLastCount === 0;

  const stats = wizardUmami.siteStats;
  const visitorsDelta = stats?.comparison
    ? deltaLabel(stats.visitors, stats.comparison.visitors)
    : null;
  const pageviewsDelta = stats?.comparison
    ? deltaLabel(stats.pageviews, stats.comparison.pageviews)
    : null;
  const visitsDelta = stats?.comparison ? deltaLabel(stats.visits, stats.comparison.visits) : null;

  const outing = wizardUmami.outingFunnel;

  return (
    <div className="flex flex-col gap-12">
      {/* === Top-row : 4 KPIs nord (PR1 refonte) === */}
      <DashboardKpis
        outingsPerDay={outingsPerDay}
        wizardUmami={wizardUmami}
        creatorActivation={creatorActivation}
      />

      {/* === Alertes auto-détectées (PR2 refonte) — n'apparaît que si règle déclenche === */}
      <DashboardAlerts wizardUmami={wizardUmami} services={services} />

      {/* === Opportunités : segments sous-performants (PR2 refonte) === */}
      <DashboardOpportunities wizardUmami={wizardUmami} />

      {/* === Section 0 : sorties créées (vue produit) === */}
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

      {/* === Section : audience site (Umami /stats + /active) === */}
      {wizardUmami.configured && (
        <section>
          <header className="mb-4 flex items-baseline justify-between gap-3">
            <div>
              <Eyebrow className="mb-2">─ audience ({wizardUmami.rangeDays}j) ─</Eyebrow>
              <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
                Trafic du site
              </h2>
            </div>
            {wizardUmami.activeVisitors !== null && (
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] ${
                  wizardUmami.activeVisitors > 0
                    ? "border-emerald-300 bg-emerald-50/40 text-emerald-700"
                    : "border-surface-400 bg-surface-100 text-ink-400"
                }`}
                title="Visiteurs uniques sur les 5 dernières minutes"
              >
                <span
                  aria-hidden
                  className={`size-2 rounded-full ${
                    wizardUmami.activeVisitors > 0 ? "bg-emerald-500" : "bg-ink-300"
                  }`}
                />
                {wizardUmami.activeVisitors} actif
                {wizardUmami.activeVisitors > 1 ? "s" : ""}
              </span>
            )}
          </header>
          {stats ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi
                label="Visiteurs"
                value={stats.visitors.toLocaleString("fr-FR")}
                sub={visitorsDelta?.text}
                tone={visitorsDelta?.tone}
              />
              <Kpi
                label="Pages vues"
                value={stats.pageviews.toLocaleString("fr-FR")}
                sub={pageviewsDelta?.text}
                tone={pageviewsDelta?.tone}
              />
              <Kpi
                label="Visites"
                value={stats.visits.toLocaleString("fr-FR")}
                sub={visitsDelta?.text}
                tone={visitsDelta?.tone}
              />
              <Kpi
                label="Bounce"
                value={pct(stats.bounces, stats.visits)}
                sub={`${stats.bounces.toLocaleString("fr-FR")} visites courtes`}
              />
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-surface-400 p-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
              /stats indisponible (Umami down ou aucune donnée).
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-xl border border-surface-400 bg-surface-100 p-4">
              <Eyebrow tone="muted">Top referrers</Eyebrow>
              <MetricList rows={wizardUmami.topReferrers} />
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-surface-400 bg-surface-100 p-4">
              <Eyebrow tone="muted">Top pages</Eyebrow>
              <MetricList rows={wizardUmami.topPaths} />
            </div>
          </div>
        </section>
      )}

      {/* === Section : funnel wizard === */}
      <section>
        <header className="mb-4">
          <Eyebrow className="mb-2">─ funnel wizard (umami) ─</Eyebrow>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
            Conversion création — {wizardUmami.rangeDays} derniers jours
          </h2>
        </header>
        {!wizardUmami.configured ? (
          <p className="rounded-xl border border-dashed border-surface-400 p-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            UMAMI_API_KEY non configurée — ajoute la clé dans .env pour voir cette section.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {funnelBroken && (
              <div className="rounded-xl border border-rose-300 bg-rose-50/60 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-rose-700">
                  ⚠ funnel cassé
                </p>
                <p className="mt-1 text-sm text-rose-700">
                  {funnelTopCount} entrées paste mais 0 publish — vérifier prod (server action,
                  validation, fetch wizard).
                </p>
              </div>
            )}
            {wizardUmami.funnel ? (
              <div className="flex flex-col gap-2 rounded-xl border border-surface-400 bg-surface-100 p-4">
                <Eyebrow tone="muted">Steps & drop-off</Eyebrow>
                <ul className="flex flex-col gap-1.5">
                  {wizardUmami.funnel.map((step, i) => {
                    const ratio = funnelTopCount > 0 ? step.count / funnelTopCount : 0;
                    const label = STEP_SHORT_LABEL[step.event] ?? step.event;
                    // Drop-off vs step précédent — colore en rouge >50% pour
                    // lever rapidement les "fuites" au sein du funnel.
                    const prev = i > 0 ? wizardUmami.funnel![i - 1].count : null;
                    const stepDrop = prev !== null && prev > 0 ? 1 - step.count / prev : null;
                    const dropTone: Tone =
                      stepDrop === null
                        ? "muted"
                        : stepDrop > 0.5
                          ? "bad"
                          : stepDrop > 0.25
                            ? "warn"
                            : "good";
                    return (
                      <li key={step.event} className="flex items-center gap-3">
                        <span className="w-16 font-mono text-[11.5px] text-ink-500">{label}</span>
                        <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-surface-200">
                          <div
                            className="h-full bg-acid-600"
                            style={{ width: `${Math.max(2, ratio * 100)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-[11.5px] tabular-nums font-bold text-ink-700">
                          {step.count.toLocaleString("fr-FR")}
                        </span>
                        <span className="w-12 text-right font-mono text-[11px] tabular-nums text-ink-500">
                          {funnelTopCount > 0 ? `${Math.round(ratio * 100)}%` : "—"}
                        </span>
                        <span
                          className={`w-16 text-right font-mono text-[11px] tabular-nums ${toneClass(dropTone)}`}
                          title="Perte vs step précédent"
                        >
                          {stepDrop === null ? "—" : `-${Math.round(stepDrop * 100)}%`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 font-mono text-[10.5px] tracking-[0.04em] text-ink-400">
                  Conversion globale paste → publish :{" "}
                  <span
                    className={`font-bold ${toneClass(
                      funnelTopCount === 0
                        ? "muted"
                        : funnelLastCount / funnelTopCount > 0.4
                          ? "good"
                          : funnelLastCount / funnelTopCount > 0.15
                            ? "warn"
                            : "bad"
                    )}`}
                  >
                    {funnelTopCount > 0
                      ? `${Math.round((funnelLastCount / funnelTopCount) * 100)} %`
                      : "—"}
                  </span>
                </p>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-surface-400 p-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
                Funnel indisponible (Umami down ou aucune donnée).
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi
                label="Paste → publish"
                value={
                  wizardUmami.pasteToPublish
                    ? `${(wizardUmami.pasteToPublish.median / 1000).toFixed(1)} s`
                    : "—"
                }
                sub={
                  wizardUmami.pasteToPublish
                    ? `médiane sur ${wizardUmami.pasteToPublish.count} publish (p90 ${(wizardUmami.pasteToPublish.p90 / 1000).toFixed(0)} s)`
                    : "pas encore de publish"
                }
              />
              <Kpi
                label="< 5 s (snap)"
                value={(wizardUmami.pasteToPublishBuckets?.lt5s ?? 0).toLocaleString("fr-FR")}
                sub={
                  wizardUmami.pasteToPublishBuckets
                    ? pct(
                        wizardUmami.pasteToPublishBuckets.lt5s,
                        wizardUmami.pasteToPublishBuckets.total
                      )
                    : "—"
                }
                tone="good"
              />
              <Kpi
                label="5-60 s"
                value={(
                  (wizardUmami.pasteToPublishBuckets?.s5to15 ?? 0) +
                  (wizardUmami.pasteToPublishBuckets?.s15to60 ?? 0)
                ).toLocaleString("fr-FR")}
                sub={
                  wizardUmami.pasteToPublishBuckets
                    ? pct(
                        wizardUmami.pasteToPublishBuckets.s5to15 +
                          wizardUmami.pasteToPublishBuckets.s15to60,
                        wizardUmami.pasteToPublishBuckets.total
                      )
                    : "—"
                }
              />
              <Kpi
                label="> 60 s"
                value={(wizardUmami.pasteToPublishBuckets?.gt60s ?? 0).toLocaleString("fr-FR")}
                sub={
                  wizardUmami.pasteToPublishBuckets
                    ? pct(
                        wizardUmami.pasteToPublishBuckets.gt60s,
                        wizardUmami.pasteToPublishBuckets.total
                      )
                    : "—"
                }
                tone={
                  wizardUmami.pasteToPublishBuckets &&
                  wizardUmami.pasteToPublishBuckets.gt60s /
                    Math.max(1, wizardUmami.pasteToPublishBuckets.total) >
                    0.2
                    ? "warn"
                    : undefined
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi
                label="Submit URL"
                value={
                  wizardUmami.pasteKind ? wizardUmami.pasteKind.url.toLocaleString("fr-FR") : "—"
                }
                sub={
                  wizardUmami.pasteKind
                    ? `${pct(wizardUmami.pasteKind.url, wizardUmami.pasteKind.total)} des paste · branche FIXED`
                    : "—"
                }
              />
              <Kpi
                label="Submit texte"
                value={
                  wizardUmami.pasteKind ? wizardUmami.pasteKind.text.toLocaleString("fr-FR") : "—"
                }
                sub={
                  wizardUmami.pasteKind
                    ? `${pct(wizardUmami.pasteKind.text, wizardUmami.pasteKind.total)} des paste · branche MANUAL`
                    : "—"
                }
              />
              <Kpi
                label="Confirm reached"
                value={(wizardUmami.confirmEntered ?? 0).toLocaleString("fr-FR")}
                sub={
                  wizardUmami.confirmEntered !== null && wizardUmami.pasteKind
                    ? `${pct(wizardUmami.confirmEntered, wizardUmami.pasteKind.url)} du submit URL · preview card`
                    : "step FIXED-only"
                }
              />
              <Kpi
                label="Gemini opt-in"
                value={(wizardUmami.geminiTriggers?.optin ?? 0).toLocaleString("fr-FR")}
                sub={
                  wizardUmami.geminiTriggers
                    ? `${pct(wizardUmami.geminiTriggers.optin, wizardUmami.geminiTriggers.total)} des triggers`
                    : "—"
                }
              />
              <Kpi
                label="Gemini bg"
                value={(wizardUmami.geminiTriggers?.bg ?? 0).toLocaleString("fr-FR")}
                sub={
                  wizardUmami.geminiTriggers
                    ? `${pct(wizardUmami.geminiTriggers.bg, wizardUmami.geminiTriggers.total)} des triggers`
                    : "—"
                }
              />
              <Kpi
                label="Gemini auto (legacy)"
                value={(wizardUmami.geminiTriggers?.auto ?? 0).toLocaleString("fr-FR")}
                sub={
                  (wizardUmami.geminiTriggers?.auto ?? 0) > 0
                    ? "⚠ régression : ne devrait plus exister"
                    : "✓ retiré (PR2a/2c)"
                }
                tone={(wizardUmami.geminiTriggers?.auto ?? 0) > 0 ? "bad" : "good"}
              />
            </div>
          </div>
        )}
      </section>

      {/* === Section : page sortie publique (post-création) === */}
      {wizardUmami.configured && (
        <section>
          <header className="mb-4">
            <Eyebrow className="mb-2">─ page sortie publique ─</Eyebrow>
            <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
              Vies des liens partagés
            </h2>
            <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-ink-500">
              Funnel post-création : qui consulte, qui répond, qui re-partage.
            </p>
          </header>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi
              label="Vues"
              value={(outing?.views ?? 0).toLocaleString("fr-FR")}
              sub={
                outing && outing.views > 0
                  ? `${(outing.views / wizardUmami.rangeDays).toFixed(1)} / jour`
                  : "—"
              }
            />
            <Kpi
              label="RSVP set"
              value={(outing?.rsvps ?? 0).toLocaleString("fr-FR")}
              sub={outing && outing.views > 0 ? `${pct(outing.rsvps, outing.views)} des vues` : "—"}
              tone={
                outing && outing.views > 5 && outing.rsvps / outing.views < 0.1 ? "warn" : undefined
              }
            />
            <Kpi
              label="Re-partages"
              value={(outing?.shares ?? 0).toLocaleString("fr-FR")}
              sub={
                outing && outing.views > 0 ? `${pct(outing.shares, outing.views)} des vues` : "—"
              }
            />
            <Kpi
              label="Yes / No / Owner"
              value={
                wizardUmami.rsvpBreakdown
                  ? `${wizardUmami.rsvpBreakdown.yes}/${wizardUmami.rsvpBreakdown.no}/${wizardUmami.rsvpBreakdown.handleOwn}`
                  : "—"
              }
              sub={
                wizardUmami.rsvpBreakdown && wizardUmami.rsvpBreakdown.total > 0
                  ? `${pct(wizardUmami.rsvpBreakdown.yes, wizardUmami.rsvpBreakdown.total)} de oui`
                  : "—"
              }
            />
          </div>

          {wizardUmami.shareChannels && wizardUmami.shareChannels.total > 0 && (
            <div className="mt-4 flex flex-col gap-2 rounded-xl border border-surface-400 bg-surface-100 p-4">
              <Eyebrow tone="muted">Canaux de partage</Eyebrow>
              <ul className="flex flex-col gap-1.5">
                {(
                  [
                    ["whatsapp", "WhatsApp", wizardUmami.shareChannels.whatsapp],
                    ["native", "Web Share natif", wizardUmami.shareChannels.native],
                    ["copy", "Copie de lien", wizardUmami.shareChannels.copy],
                    ["other", "Autres", wizardUmami.shareChannels.other],
                  ] as const
                ).map(([key, label, value]) => {
                  const ratio = value / wizardUmami.shareChannels!.total;
                  return (
                    <li key={key} className="flex items-center gap-3">
                      <span className="w-32 font-mono text-[11.5px] text-ink-500">{label}</span>
                      <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-surface-200">
                        <div
                          className="h-full bg-hot-500/70"
                          style={{ width: `${Math.max(2, ratio * 100)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-[11.5px] tabular-nums font-bold text-ink-700">
                        {value.toLocaleString("fr-FR")}
                      </span>
                      <span className="w-12 text-right font-mono text-[11px] tabular-nums text-ink-500">
                        {Math.round(ratio * 100)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* === Section : KPIs scraper OG === */}
      <section>
        <header className="mb-4">
          <Eyebrow className="mb-2">─ scraper og ─</Eyebrow>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
            Parsing d&apos;URL de billetterie
          </h2>
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            label="Requêtes"
            value={parseAgg.totalAttempts.toLocaleString("fr-FR")}
            sub={`${parseAgg.hostCount} hosts`}
          />
          <Kpi
            label="OG récupéré"
            value={parseAgg.totalSuccess.toLocaleString("fr-FR")}
            sub={pct(parseAgg.totalSuccess, parseAgg.totalAttempts)}
          />
          <Kpi
            label="Image trouvée"
            value={parseAgg.totalImageFound.toLocaleString("fr-FR")}
            sub={`${pct(parseAgg.totalImageFound, parseAgg.totalSuccess)} des succès`}
          />
          <Kpi
            label="Erreurs fetch"
            value={parseAgg.totalFetchError.toLocaleString("fr-FR")}
            sub={`${parseAgg.totalZeroData.toLocaleString("fr-FR")} pages vides`}
          />
        </div>
      </section>

      {/* === Section : services externes === */}
      <section>
        <header className="mb-4">
          <Eyebrow className="mb-2">─ services externes ─</Eyebrow>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
            Appels Gemini & Discovery API
          </h2>
        </header>
        {services.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-400 p-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            Aucun appel enregistré pour le moment.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {services.map((g) => (
              <div
                key={g.service}
                className="flex flex-col gap-3 rounded-xl border border-surface-400 bg-surface-100 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-acid-600">
                      {g.service}
                    </p>
                    <p className="text-[15px] text-ink-700">
                      <span className="font-bold">{g.totalCalls.toLocaleString("fr-FR")}</span>{" "}
                      appels —{" "}
                      <span className="font-bold">{g.totalFound.toLocaleString("fr-FR")}</span>{" "}
                      trouvés ({pct(g.totalFound, g.totalCalls)}) —{" "}
                      <span className={g.totalErrors > 0 ? "font-bold text-rose-700" : "font-bold"}>
                        {g.totalErrors.toLocaleString("fr-FR")}
                      </span>{" "}
                      erreurs
                    </p>
                  </div>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400 sm:text-right">
                    dernier appel {formatRelative(g.lastCalledAt)}
                  </span>
                </div>
                {g.sources.length > 0 && (
                  <ul className="flex flex-col gap-1 border-t border-surface-400/60 pt-2">
                    {g.sources.map((s) => (
                      <li
                        key={s.source}
                        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-mono text-[11.5px] tabular-nums text-ink-700"
                      >
                        <span className="text-ink-500">↳ {s.source}</span>
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span>
                            <span className="font-bold">{s.callCount.toLocaleString("fr-FR")}</span>{" "}
                            appels
                          </span>
                          <span className="text-ink-500">
                            {pct(s.foundCount, s.callCount)} trouvés
                          </span>
                          {s.errorCount > 0 && (
                            <span className="text-rose-700" title={s.lastErrorMessage ?? undefined}>
                              {s.errorCount.toLocaleString("fr-FR")} err.
                            </span>
                          )}
                          <span className="text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
                            {formatRelative(s.lastCalledAt)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* === Section : tableau des hosts === */}
      <section>
        <header className="mb-4">
          <Eyebrow className="mb-2">─ sites qui répondent ─</Eyebrow>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
            Détail par hostname
          </h2>
          <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-ink-500">
            Trié par volume, top {hosts.length}.
          </p>
        </header>
        {hosts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-400 p-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            Aucune requête de parsing enregistrée.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-400">
            <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
              <thead className="bg-surface-100 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Host</th>
                  <th className="px-3 py-2 text-right font-medium">Req.</th>
                  <th className="px-3 py-2 text-right font-medium">Succès</th>
                  <th className="px-3 py-2 text-right font-medium">Image</th>
                  <th className="px-3 py-2 font-medium">Dernier échec</th>
                </tr>
              </thead>
              <tbody>
                {hosts.map((h) => {
                  const successRate = h.attempts > 0 ? h.successCount / h.attempts : 0;
                  return (
                    <tr key={h.host} className="border-t border-surface-400/60">
                      <td className="px-3 py-2 font-mono text-[12.5px] text-ink-700">{h.host}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-700">
                        {h.attempts.toLocaleString("fr-FR")}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono tabular-nums font-bold ${rateColor(successRate)}`}
                      >
                        {pct(h.successCount, h.attempts)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-500">
                        {pct(h.imageFoundCount, h.successCount)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11.5px] text-ink-500">
                        {h.lastFailureAt ? (
                          <span
                            title={`${h.lastFailurePath ?? ""} — ${DATE_FMT.format(h.lastFailureAt)}`}
                          >
                            {failureKindLabel(h.lastFailureKind)} ·{" "}
                            {formatRelative(h.lastFailureAt)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* === Section : hosts à problèmes === */}
      {problemHosts.length > 0 && (
        <section>
          <header className="mb-4">
            <Eyebrow className="mb-2 text-rose-700">─ à fixer ─</Eyebrow>
            <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
              Hosts à problèmes
            </h2>
            <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-ink-500">
              Au moins 5 requêtes et taux de succès &lt; 50 %.
            </p>
          </header>
          <ul className="flex flex-col gap-2">
            {problemHosts.map((h) => (
              <li
                key={h.host}
                className="flex items-baseline justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/40 px-4 py-3"
              >
                <span className="font-mono text-[12.5px] text-ink-700">{h.host}</span>
                <span className="font-mono text-[11px] tabular-nums text-rose-700">
                  {pct(h.successCount, h.attempts)} sur {h.attempts.toLocaleString("fr-FR")} req.
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* === Section : santé wizard & acquisition (PR « MVP analytics ») === */}
      {/* Lecture pure d'events déjà émis. À ré-organiser dans la refonte */}
      {/* Phase 4 du dashboard ; placée en fin de page pour simplifier le diff. */}
      {(wizardUmami.publishFailed ||
        wizardUmami.abandonedSteps ||
        wizardUmami.outingViewedSources) && (
        <section>
          <header className="mb-4">
            <Eyebrow className="mb-2">─ santé & acquisition ─</Eyebrow>
            <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
              Wizard & vues sortie
            </h2>
            <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-ink-500">
              Causes d&rsquo;échec publish, dernière step avant abandon, source des vues sortie.
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-3">
            {wizardUmami.publishFailed && (
              <div className="rounded-xl border border-surface-300 p-4">
                <Eyebrow tone="muted">Publish échecs</Eyebrow>
                {wizardUmami.publishFailed.total === 0 ? (
                  <p className="mt-2 font-mono text-[12px] text-ink-500">
                    Aucun échec sur la fenêtre.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    <PublishFailedRow
                      label="Serveur"
                      count={wizardUmami.publishFailed.server}
                      tone="critical"
                    />
                    <PublishFailedRow
                      label="Réseau"
                      count={wizardUmami.publishFailed.network}
                      tone="critical"
                    />
                    <PublishFailedRow
                      label="Validation"
                      count={wizardUmami.publishFailed.validation}
                      tone="warn"
                    />
                    {wizardUmami.publishFailed.unknown > 0 && (
                      <PublishFailedRow
                        label="Inconnu"
                        count={wizardUmami.publishFailed.unknown}
                        tone="muted"
                      />
                    )}
                  </ul>
                )}
              </div>
            )}

            {wizardUmami.abandonedSteps && (
              <div className="rounded-xl border border-surface-300 p-4">
                <Eyebrow tone="muted">Abandons par step</Eyebrow>
                {wizardUmami.abandonedSteps.length === 0 ? (
                  <p className="mt-2 font-mono text-[12px] text-ink-500">
                    Aucun abandon enregistré.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {wizardUmami.abandonedSteps.map((row) => (
                      <li
                        key={row.step}
                        className="flex items-baseline justify-between gap-3 font-mono text-[12px]"
                      >
                        <span className="text-ink-700">{row.step}</span>
                        <span className="tabular-nums text-ink-500">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {wizardUmami.outingViewedSources && (
              <div className="rounded-xl border border-surface-300 p-4">
                <Eyebrow tone="muted">Vues sortie · source</Eyebrow>
                {wizardUmami.outingViewedSources.total === 0 ? (
                  <p className="mt-2 font-mono text-[12px] text-ink-500">Aucune vue enregistrée.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5 font-mono text-[12px]">
                    <li className="flex items-baseline justify-between gap-3">
                      <span className="text-ink-700">Partage</span>
                      <span className="tabular-nums text-ink-500">
                        {wizardUmami.outingViewedSources.share}
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between gap-3">
                      <span className="text-ink-700">Interne</span>
                      <span className="tabular-nums text-ink-500">
                        {wizardUmami.outingViewedSources.internal}
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between gap-3">
                      <span className="text-ink-700">Direct</span>
                      <span className="tabular-nums text-ink-500">
                        {wizardUmami.outingViewedSources.direct}
                      </span>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function PublishFailedRow({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "critical" | "warn" | "muted";
}) {
  // Tons alignés sur la sémantique du §9.4 du rapport audit :
  // `server`/`network` > 0 = alerte bug prod (critical), `validation` > 0
  // = friction UX à fenêtre normale (warn), reste = muted.
  const valueClass =
    count === 0
      ? "text-ink-400"
      : tone === "critical"
        ? "text-rose-700"
        : tone === "warn"
          ? "text-amber-700"
          : "text-ink-500";
  return (
    <li className="flex items-baseline justify-between gap-3 font-mono text-[12px]">
      <span className="text-ink-700">{label}</span>
      <span className={`tabular-nums ${valueClass}`}>{count}</span>
    </li>
  );
}
