import { Eyebrow } from "@/features/sortie/components/eyebrow";

/**
 * Primitives partagées par les composants `<Dashboard*>` de
 * `/sortie/admin/stat`. Extraites du `stat-dashboard.tsx` historique
 * (PR1 de la refonte) pour permettre de splitter le dashboard en
 * sections autonomes (`<DashboardKpis>`, `<DashboardAlerts>`,
 * `<DashboardWizardDetails>` etc.) sans dupliquer ces helpers.
 *
 * Les tons (`good`/`bad`/`warn`/`muted`) restent neutres aux palettes
 * (`text-emerald-700` etc.) — l'éventuel repaint en palette Sortie
 * (`acid-600` / `hot-500` / `erreur-500`) sera une passe UX séparée.
 */

export type Tone = "good" | "bad" | "muted" | "warn";

export const RELATIVE_FMT = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

export const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function toneClass(tone: Tone): string {
  switch (tone) {
    case "good":
      return "text-emerald-700";
    case "bad":
      return "text-rose-700";
    case "warn":
      return "text-amber-700";
    default:
      return "text-ink-500";
  }
}

export function pct(num: number, denom: number): string {
  if (denom <= 0) {
    return "—";
  }
  return `${Math.round((num / denom) * 100)} %`;
}

export function formatRelative(date: Date | null): string {
  if (!date) {
    return "—";
  }
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) {
    return RELATIVE_FMT.format(diffSec, "second");
  }
  if (abs < 3600) {
    return RELATIVE_FMT.format(Math.round(diffSec / 60), "minute");
  }
  if (abs < 86_400) {
    return RELATIVE_FMT.format(Math.round(diffSec / 3600), "hour");
  }
  return RELATIVE_FMT.format(Math.round(diffSec / 86_400), "day");
}

/**
 * Variation relative courant vs préc., texte court signé prêt à coller
 * sous un KPI ("+12 % vs préc.", "-3 %", "—" si dénominateur 0). Le
 * tone retourné peut être appliqué via `toneClass()`.
 */
export function deltaLabel(current: number, previous: number): { text: string; tone: Tone } {
  if (previous <= 0) {
    return { text: current > 0 ? "nouveau" : "—", tone: "muted" };
  }
  const diff = (current - previous) / previous;
  const percent = Math.round(diff * 100);
  if (percent === 0) {
    return { text: "= préc.", tone: "muted" };
  }
  const tone: Tone = percent > 0 ? "good" : "bad";
  const sign = percent > 0 ? "+" : "";
  return { text: `${sign}${percent} % vs préc.`, tone };
}

type KpiProps = {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
};

export function Kpi({ label, value, sub, tone }: KpiProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-surface-400 bg-surface-100 p-4">
      <Eyebrow tone="muted">{label}</Eyebrow>
      <p className="text-[28px] leading-none font-black tracking-[-0.02em] text-ink-700">{value}</p>
      {sub && (
        <p className={`font-mono text-[11px] tracking-[0.04em] ${toneClass(tone ?? "muted")}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

type MetricListProps = {
  rows: { name: string; value: number }[] | null;
  emptyLabel?: string;
};

export function MetricList({ rows, emptyLabel }: MetricListProps) {
  if (!rows || rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-surface-400 p-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
        {emptyLabel ?? "Aucune donnée pour la période."}
      </p>
    );
  }
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r) => {
        const ratio = r.value / max;
        return (
          <li key={r.name} className="flex items-center gap-3">
            <span className="w-44 truncate font-mono text-[11.5px] text-ink-700" title={r.name}>
              {r.name}
            </span>
            <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-surface-200">
              <div
                className="h-full bg-acid-600/80"
                style={{ width: `${Math.max(2, ratio * 100)}%` }}
              />
            </div>
            <span className="w-10 text-right font-mono text-[11.5px] tabular-nums font-bold text-ink-700">
              {r.value.toLocaleString("fr-FR")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
