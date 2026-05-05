import type { WizardUmamiStats } from "@/features/sortie/queries/wizard-umami-stats";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { Kpi, pct } from "@/features/sortie/components/dashboard/dashboard-primitives";
import { DeviceSplitSection } from "@/features/sortie/components/dashboard/dashboard-wizard-details";

type Props = {
  wizardUmami: WizardUmamiStats;
};

/**
 * Onglet « Outing » : ce qui se passe sur les pages sortie publiques
 * partagées (`/sortie/[slug]`). Funnel post-création (vues → RSVP →
 * partage), breakdown des canaux de partage, distribution des réponses
 * RSVP, source des vues (share / internal / direct) et split device.
 */
export function DashboardOutingDetails({ wizardUmami }: Props) {
  if (!wizardUmami.configured) {
    return (
      <p className="rounded-xl border border-dashed border-surface-400 p-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
        UMAMI_API_KEY non configurée — pas de funnel page sortie disponible.
      </p>
    );
  }

  const outing = wizardUmami.outingFunnel;

  return (
    <div className="flex flex-col gap-12">
      {/* === Page sortie publique : funnel post-création === */}
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
            sub={outing && outing.views > 0 ? `${pct(outing.shares, outing.views)} des vues` : "—"}
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

      {/* === Source des vues (share / internal / direct) === */}
      {wizardUmami.outingViewedSources && (
        <section>
          <header className="mb-4">
            <Eyebrow className="mb-2">─ source des vues ─</Eyebrow>
            <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
              D&rsquo;où arrivent les visiteurs
            </h2>
          </header>
          {wizardUmami.outingViewedSources.total === 0 ? (
            <p className="rounded-xl border border-dashed border-surface-400 p-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
              Aucune vue enregistrée sur la fenêtre.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Kpi
                label="Partage"
                value={wizardUmami.outingViewedSources.share.toLocaleString("fr-FR")}
                sub={pct(
                  wizardUmami.outingViewedSources.share,
                  wizardUmami.outingViewedSources.total
                )}
              />
              <Kpi
                label="Interne"
                value={wizardUmami.outingViewedSources.internal.toLocaleString("fr-FR")}
                sub={pct(
                  wizardUmami.outingViewedSources.internal,
                  wizardUmami.outingViewedSources.total
                )}
              />
              <Kpi
                label="Direct"
                value={wizardUmami.outingViewedSources.direct.toLocaleString("fr-FR")}
                sub={pct(
                  wizardUmami.outingViewedSources.direct,
                  wizardUmami.outingViewedSources.total
                )}
              />
            </div>
          )}
        </section>
      )}

      {/* === Device split sur les vues === */}
      {wizardUmami.outingViewedDevice && wizardUmami.outingViewedDevice.total > 0 && (
        <DeviceSplitSection
          title="Vues sortie · device"
          breakdown={wizardUmami.outingViewedDevice}
        />
      )}
    </div>
  );
}
