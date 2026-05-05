import type { WizardUmamiStats } from "@/features/sortie/queries/wizard-umami-stats";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

type Opportunity = {
  id: string;
  summary: string;
  detail: string;
};

type Props = {
  wizardUmami: WizardUmamiStats;
};

/**
 * Section opportunités : segments sous-performants détectés à partir
 * des breakdowns existants. N'apparaît QUE si une règle déclenche —
 * pas de section vide qui pollue le scan rapide.
 *
 * Différence avec `<DashboardAlerts>` : une opportunité n'est pas un
 * incident. C'est un signal d'amélioration possible (« copy convertit
 * 3× moins que WhatsApp »). Ton neutre, pas de couleur d'alerte.
 *
 * Cf. ANALYTICS_AUDIT.md §A.3 du plan original (rules réintroduites
 * avec les seuils ajustés au volume réel).
 */
export function DashboardOpportunities({ wizardUmami }: Props) {
  const opportunities = computeOpportunities(wizardUmami);
  if (opportunities.length === 0) {
    return null;
  }

  return (
    <section>
      <header className="mb-4">
        <Eyebrow className="mb-2">─ opportunités ─</Eyebrow>
        <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
          {opportunities.length === 1 ? "1 opportunité" : `${opportunities.length} opportunités`}
        </h2>
        <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-ink-500">
          Segments sous-performants. Pas urgent — mais potentiel d&rsquo;amélioration mesurable.
        </p>
      </header>
      <ul className="flex flex-col gap-2">
        {opportunities.map((op) => (
          <OpportunityRow key={op.id} opportunity={op} />
        ))}
      </ul>
    </section>
  );
}

function OpportunityRow({ opportunity }: { opportunity: Opportunity }) {
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-surface-400 bg-surface-100 px-4 py-3">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-acid-600">
        opportunité
      </span>
      <span className="text-[13.5px] leading-snug text-ink-700">{opportunity.summary}</span>
      <span className="font-mono text-[11px] text-ink-500">{opportunity.detail}</span>
    </li>
  );
}

/**
 * Règles d'opportunité. Toutes guardées par un seuil de volume minimum
 * (`total ≥ N`) pour éviter de générer du bruit à très faible volume —
 * une opportunité visible doit être réellement statistiquement actionable.
 */
function computeOpportunities(wizardUmami: WizardUmamiStats): Opportunity[] {
  const out: Opportunity[] = [];

  // 1. Trafic direct dominant : si la majorité arrive sans referrer
  //    identifié, le tagging UTM est probablement perdu. Volume mini 20
  //    pour éviter d'alerter sur un échantillon trop petit.
  const sources = wizardUmami.outingViewedSources;
  if (sources && sources.total >= 20 && sources.direct > sources.share + sources.internal) {
    out.push({
      id: "direct-traffic-dominant",
      summary: "Trafic direct majoritaire — referrers perdus.",
      detail: `${sources.direct} vues directes vs ${sources.share} via partage et ${sources.internal} en interne. Audit du tagging des liens partagés (WhatsApp / native API).`,
    });
  }

  // 2. Mobile sous-convertit : seulement si on a assez de volume sur
  //    les deux canaux pour comparer. À ce stade `wizardDevice` est
  //    une part des publish réussis ; on regarde si mobile < 50 % de
  //    desktop alors qu'on sait que le trafic global est mobile-first.
  const wizardDevice = wizardUmami.wizardDevice;
  const outingViewedDevice = wizardUmami.outingViewedDevice;
  if (
    wizardDevice &&
    outingViewedDevice &&
    wizardDevice.total >= 10 &&
    outingViewedDevice.total >= 20
  ) {
    // Conversion proxy = publish_succeeded(mobile) / outing_viewed(mobile).
    // Pas exact car les deux events n'ont pas le même dénominateur de
    // session, mais c'est un signal directionnel suffisant.
    const mobileRate =
      outingViewedDevice.mobile > 0 ? wizardDevice.mobile / outingViewedDevice.mobile : 0;
    const desktopRate =
      outingViewedDevice.desktop > 0 ? wizardDevice.desktop / outingViewedDevice.desktop : 0;
    if (
      desktopRate > 0 &&
      mobileRate > 0 &&
      mobileRate < 0.5 * desktopRate &&
      outingViewedDevice.mobile >= 10
    ) {
      out.push({
        id: "mobile-undersells",
        summary: "Mobile convertit moins de la moitié du desktop.",
        detail: `${wizardDevice.mobile} publish / ${outingViewedDevice.mobile} vues mobile vs ${wizardDevice.desktop} / ${outingViewedDevice.desktop} desktop. Audit clavier mobile, keyboard inset, et viewport.`,
      });
    }
  }

  // 3. Trop de "no" sur les RSVP : la sortie attire mais ne convainc
  //    pas. Volume mini 10 pour échantillon stable.
  const rsvp = wizardUmami.rsvpBreakdown;
  if (rsvp && rsvp.total >= 10 && rsvp.no / rsvp.total > 0.3) {
    const noPct = Math.round((rsvp.no / rsvp.total) * 100);
    out.push({
      id: "rsvp-too-many-no",
      summary: `${noPct} % de réponses « non » sur les RSVP.`,
      detail: `${rsvp.no} non sur ${rsvp.total} réponses. La page sortie attire mais ne convainc pas — audit du contenu (deadline, prix, vibes).`,
    });
  }

  // 4. Canal copy >> WhatsApp en partage : indique que les utilisateurs
  //    ne trouvent pas le bouton WhatsApp ou qu'il n'est pas adapté
  //    (Firefox desktop, contexte non-mobile). Seuil 3× pour ne pas
  //    déclencher à la moindre divergence.
  const channels = wizardUmami.shareChannels;
  if (channels && channels.total >= 10 && channels.copy > 3 * Math.max(channels.whatsapp, 1)) {
    out.push({
      id: "copy-dominates-whatsapp",
      summary: "Le canal « copier le lien » domine 3× WhatsApp.",
      detail: `${channels.copy} copy vs ${channels.whatsapp} whatsapp / ${channels.native} native. Pousser un CTA WhatsApp plus visible — ou audit pourquoi le natif n'apparaît pas.`,
    });
  }

  return out;
}
