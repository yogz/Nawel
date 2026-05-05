import type {
  DbTableSize,
  OrphansCounts,
  SweeperHealth,
} from "@/features/sortie/queries/stat-queries";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { formatRelative } from "@/features/sortie/components/dashboard/dashboard-primitives";

type Props = {
  dbSizes: DbTableSize[];
  orphans: OrphansCounts;
  sweeperHealth: SweeperHealth;
};

/**
 * Sections santé DB pour `/admin/stat/tech` :
 *   - Top 10 tables par taille (data + index + toast)
 *   - 3 compteurs orphelins purgeables (cf. memory `project_sortie_anon_db_growth.md`)
 *   - 30 dernières runs sweeper
 */
export function TechDb({ dbSizes, orphans, sweeperHealth }: Props) {
  return (
    <>
      {/* === Sweeper history === */}
      <section>
        <header className="mb-4">
          <Eyebrow className="mb-2">─ sweeper ─</Eyebrow>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
            30 dernières runs
          </h2>
          <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-ink-500">
            Cron daily Vercel à 7h Paris. Une row par tick, persistée depuis 2026-05.
          </p>
        </header>
        {sweeperHealth.recentRuns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-400 p-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            Aucune run enregistrée — déploiement récent ou cron non déclenché.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-400">
            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
              <thead className="bg-surface-100 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Quand</th>
                  <th className="px-3 py-2 text-right font-medium">Durée</th>
                  <th className="px-3 py-2 text-right font-medium">RSVP</th>
                  <th className="px-3 py-2 text-right font-medium">J-1</th>
                  <th className="px-3 py-2 text-right font-medium">Past</th>
                  <th className="px-3 py-2 text-right font-medium">Tickets</th>
                  <th className="px-3 py-2 text-right font-medium">Err.</th>
                </tr>
              </thead>
              <tbody>
                {sweeperHealth.recentRuns.map((r) => (
                  <tr key={r.id} className="border-t border-surface-400/60">
                    <td className="px-3 py-2 font-mono text-[12px] text-ink-700">
                      {formatRelative(r.startedAt)}
                      {r.lockSkipped && (
                        <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-hot-500">
                          skip
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-500">
                      {r.durationMs !== null ? `${r.durationMs} ms` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-700">
                      {r.closedRsvps}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-700">
                      {r.j1Reminders}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-700">
                      {r.markedPast}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-700">
                      {r.ticketsCleanedUp}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono tabular-nums ${
                        r.errorsCount > 0 ? "font-bold text-rose-700" : "text-ink-500"
                      }`}
                    >
                      {r.errorsCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* === Orphelins purgeables === */}
      <section>
        <header className="mb-4">
          <Eyebrow className="mb-2">─ orphelins ─</Eyebrow>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
            Candidats au purge
          </h2>
          <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-ink-500">
            Rows qui peuvent être supprimées sans perte fonctionnelle. À ajouter au sweeper.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <OrphansCard
            label="Participants anonymes"
            count={orphans.staleAnonymousParticipants}
            help="Anonymes sur sortie past/cancelled/settled depuis > 90j"
          />
          <OrphansCard
            label="Magic links"
            count={orphans.expiredMagicLinks}
            help="Tokens expirés (anonymous reclaim)"
          />
          <OrphansCard
            label="Sessions Better Auth"
            count={orphans.expiredSessions}
            help="Sessions dont expires_at < now()"
          />
        </div>
      </section>

      {/* === Top 10 tailles tables === */}
      <section>
        <header className="mb-4">
          <Eyebrow className="mb-2">─ tailles tables ─</Eyebrow>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
            Top 10 tables (Postgres)
          </h2>
          <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-ink-500">
            Data + index + toast. Le nombre de rows est une approximation (autovacuum).
          </p>
        </header>
        {dbSizes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-400 p-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            Aucune table lisible — accès `pg_class` refusé ?
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-400">
            <table className="w-full min-w-[480px] border-collapse text-left text-[14px]">
              <thead className="bg-surface-100 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Table</th>
                  <th className="px-3 py-2 text-right font-medium">~ Rows</th>
                  <th className="px-3 py-2 text-right font-medium">Taille</th>
                </tr>
              </thead>
              <tbody>
                {dbSizes.map((t) => (
                  <tr key={t.qualifiedName} className="border-t border-surface-400/60">
                    <td className="px-3 py-2 font-mono text-[12.5px] text-ink-700">
                      {t.qualifiedName}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-700">
                      {t.approxRows.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-700">
                      {formatBytes(t.totalBytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function OrphansCard({ label, count, help }: { label: string; count: number; help: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-surface-400 bg-surface-100 p-4">
      <Eyebrow tone="muted">{label}</Eyebrow>
      <p
        className={`text-[28px] leading-none font-black tracking-[-0.02em] ${
          count > 0 ? "text-hot-500" : "text-ink-700"
        }`}
      >
        {count.toLocaleString("fr-FR")}
      </p>
      <p className="font-mono text-[10.5px] tracking-[0.04em] text-ink-500">{help}</p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
