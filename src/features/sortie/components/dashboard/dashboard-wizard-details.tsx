import type { WizardUmamiStats } from "@/features/sortie/queries/wizard-umami-stats";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import {
  Kpi,
  MetricList,
  type Tone,
  deltaLabel,
  pct,
  toneClass,
} from "@/features/sortie/components/dashboard/dashboard-primitives";

type Props = {
  wizardUmami: WizardUmamiStats;
};

const STEP_SHORT_LABEL: Record<string, string> = {
  wizard_step_paste_entered: "paste",
  wizard_paste_submitted: "submit",
  wizard_step_date_entered: "date",
  wizard_step_commit_entered: "commit",
  wizard_publish_succeeded: "publish",
};

/**
 * Onglet « Wizard » du dashboard `/admin/stat`. Audience site (Umami
 * /stats + top referrers + top paths) en entrée, puis funnel wizard
 * complet (steps, paste→publish, kind, Gemini) et la santé du publish
 * (échecs, abandons par step). Extrait du `stat-dashboard.tsx`
 * monolithique sans changement de markup.
 */
export function DashboardWizardDetails({ wizardUmami }: Props) {
  const stats = wizardUmami.siteStats;
  const visitorsDelta = stats?.comparison
    ? deltaLabel(stats.visitors, stats.comparison.visitors)
    : null;
  const pageviewsDelta = stats?.comparison
    ? deltaLabel(stats.pageviews, stats.comparison.pageviews)
    : null;
  const visitsDelta = stats?.comparison ? deltaLabel(stats.visits, stats.comparison.visits) : null;

  const funnel = wizardUmami.funnel;
  const funnelTopCount = funnel?.[0]?.count ?? 0;
  const funnelLastCount = funnel?.[funnel.length - 1]?.count ?? 0;
  const funnelBroken = funnel !== null && funnelTopCount >= 5 && funnelLastCount === 0;

  if (!wizardUmami.configured) {
    return (
      <p className="rounded-xl border border-dashed border-surface-400 p-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
        UMAMI_API_KEY non configurée — ajoute la clé dans .env pour voir cette section.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {/* === Audience (Umami /stats + top referrers/paths) === */}
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

      {/* === Funnel wizard + paste→publish + kind + Gemini === */}
      <section>
        <header className="mb-4">
          <Eyebrow className="mb-2">─ funnel wizard ─</Eyebrow>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
            Conversion création — {wizardUmami.rangeDays} derniers jours
          </h2>
        </header>
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
          {funnel ? (
            <div className="flex flex-col gap-2 rounded-xl border border-surface-400 bg-surface-100 p-4">
              <Eyebrow tone="muted">Steps & drop-off</Eyebrow>
              <ul className="flex flex-col gap-1.5">
                {funnel.map((step, i) => {
                  const ratio = funnelTopCount > 0 ? step.count / funnelTopCount : 0;
                  const label = STEP_SHORT_LABEL[step.event] ?? step.event;
                  const prev = i > 0 ? funnel[i - 1].count : null;
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
      </section>

      {/* === Santé publish (échecs + abandons) === */}
      {(wizardUmami.publishFailed || wizardUmami.abandonedSteps) && (
        <section>
          <header className="mb-4">
            <Eyebrow className="mb-2">─ santé publish ─</Eyebrow>
            <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
              Échecs & abandons
            </h2>
            <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-ink-500">
              Causes d&rsquo;échec publish et dernière step avant abandon du wizard.
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </section>
      )}

      {/* === Device split wizard === */}
      {wizardUmami.wizardDevice && wizardUmami.wizardDevice.total > 0 && (
        <DeviceSplitSection title="Wizard publish · device" breakdown={wizardUmami.wizardDevice} />
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

/**
 * Utilisé aussi par `<DashboardOutingDetails>` — la section device est
 * cliente du même breakdown shape `DeviceBreakdown`. Co-localisé ici
 * pour éviter une 4ᵉ création de fichier juste pour 30 lignes.
 */
export function DeviceSplitSection({
  title,
  breakdown,
}: {
  title: string;
  breakdown: { mobile: number; tablet: number; desktop: number; unknown: number; total: number };
}) {
  const rows: { name: string; value: number }[] = [
    { name: "Mobile", value: breakdown.mobile },
    { name: "Tablet", value: breakdown.tablet },
    { name: "Desktop", value: breakdown.desktop },
  ];
  if (breakdown.unknown > 0) {
    rows.push({ name: "Inconnu (events legacy)", value: breakdown.unknown });
  }
  return (
    <section>
      <header className="mb-3">
        <Eyebrow tone="muted">{title}</Eyebrow>
      </header>
      <MetricList rows={rows} />
    </section>
  );
}
