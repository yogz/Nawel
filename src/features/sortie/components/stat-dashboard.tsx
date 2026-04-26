import type {
  HostStat,
  OutingsPerDay,
  ParseAggregate,
  ServiceCallGroup,
} from "@/features/sortie/queries/stat-queries";

type Props = {
  parseAgg: ParseAggregate;
  services: ServiceCallGroup[];
  hosts: HostStat[];
  outingsPerDay: OutingsPerDay[];
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

const RELATIVE_FMT = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatRelative(date: Date | null): string {
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

function pct(num: number, denom: number): string {
  if (denom <= 0) {
    return "—";
  }
  return `${Math.round((num / denom) * 100)} %`;
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

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-ivoire-400 bg-ivoire-100 p-4">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-encre-400">{label}</p>
      <p className="text-[28px] leading-none font-black tracking-[-0.02em] text-encre-700">
        {value}
      </p>
      {sub && <p className="font-mono text-[11px] tracking-[0.04em] text-encre-500">{sub}</p>}
    </div>
  );
}

export function StatDashboard({ parseAgg, services, hosts, outingsPerDay }: Props) {
  const problemHosts = hosts
    .filter((h) => h.attempts >= 5 && h.successCount / h.attempts < 0.5)
    .slice(0, 10);

  const days = fill7Days(outingsPerDay);
  const totalCreated7d = days.reduce((sum, d) => sum + d.totalCount, 0);
  const totalActive7d = days.reduce((sum, d) => sum + d.activeCount, 0);
  // Hauteur max pour normaliser les barres : 1 minimum pour que l'axe
  // ne soit pas écrasé même quand toutes les valeurs sont 0.
  const maxCount = Math.max(1, ...days.map((d) => d.totalCount));

  return (
    <div className="flex flex-col gap-12">
      {/* === Section 0 : sorties créées (vue produit) === */}
      <section>
        <header className="mb-4">
          <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
            ─ création sorties ─
          </p>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-encre-700">
            Sorties créées (7 derniers jours)
          </h2>
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            label="Total 7j"
            value={totalCreated7d.toLocaleString("fr-FR")}
            sub={`${totalActive7d.toLocaleString("fr-FR")} actives`}
          />
          <div className="col-span-2 flex flex-col gap-1 rounded-xl border border-ivoire-400 bg-ivoire-100 p-4 sm:col-span-3">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-encre-400">
              Par jour
            </p>
            <div className="mt-1 flex h-24 items-end gap-2">
              {days.map((d) => {
                const height = (d.totalCount / maxCount) * 100;
                const cancelled = d.totalCount - d.activeCount;
                const cancelledRatio = d.totalCount > 0 ? cancelled / d.totalCount : 0;
                return (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <div className="relative flex h-full w-full items-end overflow-hidden rounded-md bg-ivoire-200">
                      {d.totalCount > 0 && (
                        <div
                          className="w-full bg-bordeaux-600"
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
                    <span className="font-mono text-[10px] tabular-nums text-encre-500">
                      {DAY_LABEL_FMT.format(new Date(`${d.day}T12:00:00`))}
                    </span>
                    <span className="font-mono text-[11px] font-bold tabular-nums text-encre-700">
                      {d.totalCount}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* === Section 1 : KPIs scraper OG === */}
      <section>
        <header className="mb-4">
          <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
            ─ scraper og ─
          </p>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-encre-700">
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

      {/* === Section 2 : services externes === */}
      <section>
        <header className="mb-4">
          <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
            ─ services externes ─
          </p>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-encre-700">
            Appels Gemini & Discovery API
          </h2>
        </header>
        {services.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ivoire-400 p-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-encre-400">
            Aucun appel enregistré pour le moment.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {services.map((g) => (
              <div
                key={g.service}
                className="flex flex-col gap-3 rounded-xl border border-ivoire-400 bg-ivoire-100 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-bordeaux-600">
                      {g.service}
                    </p>
                    <p className="text-[15px] text-encre-700">
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
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-encre-400 sm:text-right">
                    dernier appel {formatRelative(g.lastCalledAt)}
                  </span>
                </div>
                {g.sources.length > 0 && (
                  <ul className="flex flex-col gap-1 border-t border-ivoire-400/60 pt-2">
                    {g.sources.map((s) => (
                      <li
                        key={s.source}
                        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-mono text-[11.5px] tabular-nums text-encre-700"
                      >
                        <span className="text-encre-500">↳ {s.source}</span>
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span>
                            <span className="font-bold">{s.callCount.toLocaleString("fr-FR")}</span>{" "}
                            appels
                          </span>
                          <span className="text-encre-500">
                            {pct(s.foundCount, s.callCount)} trouvés
                          </span>
                          {s.errorCount > 0 && (
                            <span className="text-rose-700" title={s.lastErrorMessage ?? undefined}>
                              {s.errorCount.toLocaleString("fr-FR")} err.
                            </span>
                          )}
                          <span className="text-[10.5px] uppercase tracking-[0.18em] text-encre-400">
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

      {/* === Section 3 : tableau des hosts === */}
      <section>
        <header className="mb-4">
          <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
            ─ sites qui répondent ─
          </p>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-encre-700">
            Détail par hostname
          </h2>
          <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-encre-500">
            Trié par volume, top {hosts.length}.
          </p>
        </header>
        {hosts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ivoire-400 p-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-encre-400">
            Aucune requête de parsing enregistrée.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-ivoire-400">
            <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
              <thead className="bg-ivoire-100 font-mono text-[10.5px] uppercase tracking-[0.18em] text-encre-500">
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
                    <tr key={h.host} className="border-t border-ivoire-400/60">
                      <td className="px-3 py-2 font-mono text-[12.5px] text-encre-700">{h.host}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-encre-700">
                        {h.attempts.toLocaleString("fr-FR")}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono tabular-nums font-bold ${rateColor(successRate)}`}
                      >
                        {pct(h.successCount, h.attempts)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-encre-500">
                        {pct(h.imageFoundCount, h.successCount)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11.5px] text-encre-500">
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

      {/* === Section 4 : hosts à problèmes === */}
      {problemHosts.length > 0 && (
        <section>
          <header className="mb-4">
            <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-rose-700">
              ─ à fixer ─
            </p>
            <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-encre-700">
              Hosts à problèmes
            </h2>
            <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-encre-500">
              Au moins 5 requêtes et taux de succès &lt; 50 %.
            </p>
          </header>
          <ul className="flex flex-col gap-2">
            {problemHosts.map((h) => (
              <li
                key={h.host}
                className="flex items-baseline justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/40 px-4 py-3"
              >
                <span className="font-mono text-[12.5px] text-encre-700">{h.host}</span>
                <span className="font-mono text-[11px] tabular-nums text-rose-700">
                  {pct(h.successCount, h.attempts)} sur {h.attempts.toLocaleString("fr-FR")} req.
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
