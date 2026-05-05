import type { ServiceCallGroup } from "@/features/sortie/queries/stat-queries";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { formatRelative, pct } from "@/features/sortie/components/dashboard/dashboard-primitives";

type Props = {
  services: ServiceCallGroup[];
};

/**
 * Détail des appels services externes (Gemini, Discovery API…).
 * Extrait du `stat-dashboard.tsx` historique sans modification du
 * markup — seulement déplacé vers la page tech (cf. plan PR8).
 */
export function TechServices({ services }: Props) {
  return (
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
                    <span className="font-bold">{g.totalCalls.toLocaleString("fr-FR")}</span> appels
                    — <span className="font-bold">{g.totalFound.toLocaleString("fr-FR")}</span>{" "}
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
  );
}
