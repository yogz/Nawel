import type { ServiceCallGroup } from "@/features/sortie/queries/stat-queries";
import type { WizardUmamiStats } from "@/features/sortie/queries/wizard-umami-stats";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

type Severity = "critical" | "warn";

type Alert = {
  id: string;
  severity: Severity;
  summary: string;
};

type Props = {
  wizardUmami: WizardUmamiStats;
  services: ServiceCallGroup[];
};

/**
 * Section alertes auto-détectées. N'apparaît QUE si au moins 1 règle
 * déclenche — c'est le contrat UX du dashboard refondu (cf.
 * ANALYTICS_AUDIT.md §10.4 + plan PR2). Pas de dashboard rouge en
 * permanence : si tout va bien, la section disparaît, le owner sait
 * qu'il n'y a rien à regarder.
 *
 * Les règles sont écrites en absolu (pas de %) pour rester lisibles
 * tant que volume < 200 sessions/sem (§9.2 du rapport audit).
 */
export function DashboardAlerts({ wizardUmami, services }: Props) {
  const alerts = computeAlerts(wizardUmami, services);
  if (alerts.length === 0) {
    return null;
  }

  // Tri par sévérité : critical d'abord, warn ensuite. Stabilité au sein
  // d'une sévérité = ordre d'insertion dans `computeAlerts` (intentionnel).
  const sorted = [...alerts].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  return (
    <section>
      <header className="mb-4">
        <Eyebrow className="mb-2 text-erreur-500">─ alertes ─</Eyebrow>
        <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
          {sorted.length === 1 ? "1 alerte" : `${sorted.length} alertes`}
        </h2>
        <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-ink-500">
          Règles auto-détectées. Disparaissent dès que la condition n&rsquo;est plus vraie.
        </p>
      </header>
      <ul className="flex flex-col gap-2">
        {sorted.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </ul>
    </section>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const isCritical = alert.severity === "critical";
  return (
    <li
      className={`flex items-baseline gap-3 rounded-xl border px-4 py-3 ${
        isCritical ? "border-erreur-500/40 bg-erreur-500/5" : "border-hot-500/30 bg-hot-500/5"
      }`}
    >
      <span
        aria-hidden
        className={`mt-1 size-1.5 shrink-0 rounded-full ${
          isCritical ? "animate-pulse bg-erreur-500" : "bg-hot-500"
        }`}
      />
      <div className="flex flex-1 flex-col gap-0.5">
        <span
          className={`font-mono text-[10.5px] uppercase tracking-[0.22em] ${
            isCritical ? "text-erreur-500" : "text-hot-500"
          }`}
        >
          {isCritical ? "critique" : "à surveiller"}
        </span>
        <span className="text-[13.5px] leading-snug text-ink-700">{alert.summary}</span>
      </div>
    </li>
  );
}

function severityRank(s: Severity): number {
  return s === "critical" ? 0 : 1;
}

/**
 * Calcule les alertes à partir des données disponibles. Chaque règle
 * est un guard simple — pas d'effet de bord, déterministe pour un
 * snapshot donné. Inspirées des §10.4 du rapport audit + §A.2 du plan
 * `/admin/stat` produit.
 */
function computeAlerts(wizardUmami: WizardUmamiStats, services: ServiceCallGroup[]): Alert[] {
  const out: Alert[] = [];

  // 1. Échecs publish serveur ou réseau — bug prod silencieux côté UX,
  //    visible que par le dashboard. Critique dès le 1ᵉʳ.
  const failed = wizardUmami.publishFailed;
  if (failed && failed.server + failed.network > 0) {
    const total = failed.server + failed.network;
    out.push({
      id: "publish-server-or-network-failure",
      severity: "critical",
      summary: `${total} publish ${total > 1 ? "ont échoué" : "a échoué"} côté serveur ou réseau (dont ${failed.server} serveur, ${failed.network} réseau). Investigue les logs Vercel sur la fenêtre.`,
    });
  }

  // 2. Funnel wizard cassé : le 1er step (paste) a du volume mais le
  //    dernier (publish) est à 0. Signale un blocage backend ou form.
  const funnel = wizardUmami.funnel;
  if (funnel && funnel.length >= 2) {
    const top = funnel[0]?.count ?? 0;
    const last = funnel[funnel.length - 1]?.count ?? 0;
    if (top >= 5 && last === 0) {
      out.push({
        id: "funnel-broken",
        severity: "critical",
        summary: `Funnel wizard cassé : ${top} entrées paste mais 0 publish réussi sur la fenêtre. Probable bug de validation ou d'auth bloquant la dernière step.`,
      });
    }
  }

  // 3. Trafic présent mais aucune publication 14j — dérive produit ou
  //    regression UX. Ne déclenche que sur fenêtre ≥ 14j (sinon faux
  //    positif systématique sur la plage 7j la 1ʳᵉ semaine).
  const stats = wizardUmami.siteStats;
  if (
    wizardUmami.rangeDays >= 14 &&
    stats &&
    stats.visitors >= 5 &&
    funnel &&
    (funnel[funnel.length - 1]?.count ?? 0) === 0
  ) {
    out.push({
      id: "no-publish-with-traffic",
      severity: "critical",
      summary: `${stats.visitors} visiteurs sur la fenêtre mais 0 sortie publiée. Le produit attire mais ne convertit personne — audit du wizard urgent.`,
    });
  }

  // 4. Pixel Umami cassé : si Umami est configuré (clé API présente)
  //    mais retourne 0 visiteur sur ≥ 7j, c'est probablement le tag
  //    `<Script>` qui ne charge pas (CSP, ad-blocker, ou DNS).
  if (wizardUmami.configured && stats && stats.visitors === 0 && wizardUmami.rangeDays >= 7) {
    out.push({
      id: "umami-pixel-down",
      severity: "critical",
      summary: `0 visiteur Umami sur ${wizardUmami.rangeDays}j alors que le tracking est configuré. Pixel non chargé : CSP, ad-blocker, ou DNS. Vérifie data-website-id dans (sortie)/layout.tsx.`,
    });
  }

  // 5. Régression Gemini auto : depuis 2026-04 l'auto-déclenchement
  //    devait être éteint au profit de l'opt-in. Si `auto > 0` revient,
  //    c'est qu'une PR a réintroduit le chemin legacy.
  const gemini = wizardUmami.geminiTriggers;
  if (gemini && gemini.auto > 0) {
    out.push({
      id: "gemini-auto-regression",
      severity: "warn",
      summary: `Gemini auto-déclenché ${gemini.auto} fois — ce chemin était censé être désactivé depuis PR2c. Une régression a probablement été introduite.`,
    });
  }

  // 6. Wizard galère : > 30 % des publish prennent plus de 60 s sur
  //    une fenêtre avec ≥ 10 publish. Au-dessous de 10 c'est du bruit.
  const buckets = wizardUmami.pasteToPublishBuckets;
  if (buckets && buckets.total >= 10 && buckets.gt60s / buckets.total > 0.3) {
    const slowPct = Math.round((buckets.gt60s / buckets.total) * 100);
    out.push({
      id: "paste-to-publish-slow",
      severity: "warn",
      summary: `${slowPct} % des publish prennent plus de 60 s (${buckets.gt60s} sur ${buckets.total}). Wizard probablement lent ou utilisateurs bloqués sur une étape.`,
    });
  }

  // 7. Service externe en erreur récente : Gemini ou Discovery API
  //    avec ≥ 1 erreur dans les 24h. La logique `lastErrorAt < 24h`
  //    n'est pas accessible ici sans helper — on regarde l'erreur
  //    cumulée tant qu'elle existe et qu'il y a des appels récents.
  for (const service of services) {
    if (service.totalErrors > 0 && service.lastCalledAt) {
      const ageMs = Date.now() - service.lastCalledAt.getTime();
      const within24h = ageMs < 24 * 60 * 60 * 1000;
      if (within24h) {
        out.push({
          id: `service-error-${service.service}`,
          severity: "warn",
          summary: `Service externe « ${service.service} » a ${service.totalErrors} erreur${service.totalErrors > 1 ? "s" : ""} récente${service.totalErrors > 1 ? "s" : ""} (dernier appel < 24h). Vérifie les sources d'appel.`,
        });
      }
    }
  }

  return out;
}
