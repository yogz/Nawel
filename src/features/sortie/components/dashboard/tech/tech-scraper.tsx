import type { HostStat, ParseAggregate } from "@/features/sortie/queries/stat-queries";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import {
  DATE_FMT,
  Kpi,
  formatRelative,
  pct,
} from "@/features/sortie/components/dashboard/dashboard-primitives";

type Props = {
  parseAgg: ParseAggregate;
  hosts: HostStat[];
};

/**
 * Sections scraper OG : KPIs agrégés + table par host + hosts à
 * problèmes. Extrait depuis `stat-dashboard.tsx`. Markup conservé,
 * seulement déplacé vers `/admin/stat/tech`.
 */
export function TechScraper({ parseAgg, hosts }: Props) {
  const problemHosts = hosts
    .filter((h) => h.attempts >= 5 && h.successCount / h.attempts < 0.5)
    .slice(0, 10);

  return (
    <>
      {/* === KPIs scraper agrégés === */}
      <section>
        <header className="mb-4">
          <Eyebrow className="mb-2">─ scraper og ─</Eyebrow>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
            Parsing d&rsquo;URLs
          </h2>
          <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-ink-500">
            {parseAgg.hostCount.toLocaleString("fr-FR")} hosts suivis.
          </p>
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Tentatives" value={parseAgg.totalAttempts.toLocaleString("fr-FR")} />
          <Kpi
            label="Succès"
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

      {/* === Table des hosts === */}
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

      {/* === Hosts à problèmes === */}
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
    </>
  );
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
