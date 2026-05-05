import type { OutingsPerDay, CreatorActivation28d } from "@/features/sortie/queries/stat-queries";
import type { WizardUmamiStats } from "@/features/sortie/queries/wizard-umami-stats";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import {
  Kpi,
  type Tone,
  deltaLabel,
} from "@/features/sortie/components/dashboard/dashboard-primitives";

type Props = {
  outingsPerDay: OutingsPerDay[];
  wizardUmami: WizardUmamiStats;
  creatorActivation: CreatorActivation28d;
};

/**
 * Top-row de 4 KPIs nord pour `/sortie/admin/stat`. Toujours visible,
 * scan en < 5s. Définition §9.2 du rapport audit :
 *   - Acquisition  : visiteurs uniques (Umami) + Δ vs période préc.
 *   - Conversion   : sorties publiées 7j (DB) + Δ vs 7j préc.
 *   - Activation   : créateurs ayant publié ET reçu ≥1 rsvp sur 28j (DB)
 *   - Santé        : nb échecs publish (server + network) sur la fenêtre
 *
 * Les seuils suivent la posture §9.2 : valeurs absolues plutôt que
 * ratios tant que volume < 200 sessions/sem (les % oscillent trop). Le
 * verdict `tone` se calcule par règles d'absolu locales (warn/crit), le
 * Δ relatif est affiché à part en sub-label informatif.
 */
export function DashboardKpis({ outingsPerDay, wizardUmami, creatorActivation }: Props) {
  const visitorsKpi = computeVisitorsKpi(wizardUmami);
  const publishedKpi = computePublishedKpi(outingsPerDay);
  const activationKpi = computeActivationKpi(creatorActivation);
  const errorsKpi = computeErrorsKpi(wizardUmami);

  return (
    <section>
      <header className="mb-4">
        <Eyebrow className="mb-2">─ vue d&rsquo;ensemble ─</Eyebrow>
        <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
          Cette semaine
        </h2>
        <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-ink-500">
          4 chiffres à regarder en premier. Activation = créateur qui voit le produit fonctionner (≥
          1 sortie publiée + ≥ 1 RSVP reçu) sur 28&nbsp;j glissants.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="Visiteurs uniques"
          value={visitorsKpi.value}
          sub={visitorsKpi.sub}
          tone={visitorsKpi.tone}
        />
        <Kpi
          label="Sorties publiées 7j"
          value={publishedKpi.value}
          sub={publishedKpi.sub}
          tone={publishedKpi.tone}
        />
        <Kpi
          label="Activation 28j"
          value={activationKpi.value}
          sub={activationKpi.sub}
          tone={activationKpi.tone}
        />
        <Kpi
          label="Échecs publish"
          value={errorsKpi.value}
          sub={errorsKpi.sub}
          tone={errorsKpi.tone}
        />
      </div>
    </section>
  );
}

type KpiOutput = { value: string; sub: string; tone: Tone };

function computeVisitorsKpi(wizardUmami: WizardUmamiStats): KpiOutput {
  const stats = wizardUmami.siteStats;
  if (!stats) {
    return {
      value: "—",
      sub: wizardUmami.configured ? "Aucun visiteur sur la fenêtre" : "Umami non configuré",
      tone: "muted",
    };
  }
  const delta = stats.comparison
    ? deltaLabel(stats.visitors, stats.comparison.visitors)
    : { text: "période préc. indispo", tone: "muted" as const };
  // Verdict : crit si 0 visiteurs sur 7j+ (pixel cassé / DNS), warn si
  // baisse > 20 % avec ≥ 5 visiteurs sur la période préc. — sinon muted.
  let tone: Tone = "muted";
  if (stats.visitors === 0 && wizardUmami.rangeDays >= 7) {
    tone = "bad";
  } else if (stats.comparison && stats.comparison.visitors >= 5) {
    const ratio = stats.visitors / stats.comparison.visitors;
    if (ratio < 0.8) {
      tone = "warn";
    } else if (ratio >= 1) {
      tone = "good";
    }
  }
  return {
    value: stats.visitors.toLocaleString("fr-FR"),
    sub: delta.text,
    tone,
  };
}

function computePublishedKpi(outingsPerDay: OutingsPerDay[]): KpiOutput {
  // outingsPerDay couvre les 7 derniers jours côté query, on peut sommer
  // direct. Pas de période précédente DB-side aujourd'hui — on garde un
  // sub-label statique pour l'instant ; PR future pour un Δ réel.
  const total = outingsPerDay.reduce((sum, r) => sum + r.totalCount, 0);
  let tone: Tone = "muted";
  let sub = "7 derniers jours";
  if (total === 0) {
    tone = "bad";
    sub = "0 publish 7j — pipeline mort ?";
  } else if (total >= 5) {
    tone = "good";
  }
  return {
    value: total.toLocaleString("fr-FR"),
    sub,
    tone,
  };
}

function computeActivationKpi(creatorActivation: CreatorActivation28d): KpiOutput {
  const { totalCreators, activatedCreators } = creatorActivation;
  if (totalCreators === 0) {
    return {
      value: "—",
      sub: "Aucun créateur authentifié sur 28j",
      tone: "muted",
    };
  }
  const ratio = activatedCreators / totalCreators;
  // Verdict : à faible volume on ne lit pas un %. On regarde l'absolu :
  //   - 0 créateurs activés sur 28j = warn (le produit ne génère aucun
  //     écho social — le levier viral ne tourne pas)
  //   - sinon good si ratio ≥ 0.5, muted sinon
  let tone: Tone = "muted";
  if (activatedCreators === 0) {
    tone = "warn";
  } else if (ratio >= 0.5) {
    tone = "good";
  }
  return {
    value: `${activatedCreators} / ${totalCreators}`,
    sub: `${Math.round(ratio * 100)} % des créateurs ont reçu ≥ 1 RSVP`,
    tone,
  };
}

function computeErrorsKpi(wizardUmami: WizardUmamiStats): KpiOutput {
  const failed = wizardUmami.publishFailed;
  if (!failed) {
    return {
      value: "—",
      sub: "Lecture Umami indispo",
      tone: "muted",
    };
  }
  const critical = failed.server + failed.network;
  const validation = failed.validation;
  // Verdict :
  //   - server + network ≥ 3 sur la fenêtre → critique (bug prod silencieux)
  //   - server + network ≥ 1 → warn (un seul échec serveur reste suspect)
  //   - sinon, validation seul ≥ 1 affiché en muted
  let tone: Tone = "muted";
  let sub: string;
  if (critical >= 3) {
    tone = "bad";
    sub = `${critical} échec${critical > 1 ? "s" : ""} serveur/réseau — incident probable`;
  } else if (critical >= 1) {
    tone = "warn";
    sub = `${critical} échec${critical > 1 ? "s" : ""} serveur/réseau — investiguer`;
  } else if (validation >= 1) {
    sub = `${validation} validation${validation > 1 ? "s" : ""} — friction UX`;
  } else {
    tone = "good";
    sub = "Aucun échec sur la fenêtre";
  }
  return {
    value: critical > 0 ? String(critical) : String(failed.total),
    sub,
    tone,
  };
}
