import type { WizardUmamiStats } from "@/features/sortie/queries/wizard-umami-stats";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { Kpi, type Tone, pct } from "@/features/sortie/components/dashboard/dashboard-primitives";

type Props = {
  wizardUmami: WizardUmamiStats;
};

/**
 * Onglet « Auth » : funnel signin Sortie. Lit les events `auth_signin_*`
 * câblés en PR1 sur `SortieAuthForm` :
 *   - `started → succeeded` mesure la complétion (un magic-link non
 *     vérifié, un mauvais mot de passe ou un Google qui foire en route
 *     n'incrémenteront pas le _succeeded).
 *   - `is_new_account` distingue signup vs signin parmi les succès.
 *   - `method` profile la pression sur les 3 canaux (magic-link reste
 *     le primaire dans `SortieAuthForm`).
 *
 * Limite Google : `signIn.social` redirige sans retour client, donc le
 * `_succeeded` Google n'est pas émis depuis le form. Le ratio Google
 * paraîtra plus bas qu'il ne l'est en réalité — sera corrigé en suivi
 * via détection 1ʳᵉ session côté `SortieAnalyticsSessionSync`.
 */
export function DashboardAuthDetails({ wizardUmami }: Props) {
  const funnel = wizardUmami.authFunnel;
  const newAccount = wizardUmami.authNewAccount;
  const methods = wizardUmami.authMethod;

  if (!funnel) {
    return (
      <p className="rounded-xl border border-dashed border-surface-400 p-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
        Aucun event auth enregistré sur la fenêtre — les events `auth_signin_*` viennent
        d&rsquo;être câblés (PR1) et arriveront au fil des prochaines sessions.
      </p>
    );
  }

  const completionRate = funnel.started > 0 ? funnel.succeeded / funnel.started : 0;
  // Verdict : warn si <60%, bad si <40% sur ≥10 tentatives. <10 tentatives = muted.
  let completionTone: Tone = "muted";
  if (funnel.started >= 10) {
    if (completionRate < 0.4) {
      completionTone = "bad";
    } else if (completionRate < 0.6) {
      completionTone = "warn";
    } else {
      completionTone = "good";
    }
  }

  return (
    <div className="flex flex-col gap-12">
      {/* === Funnel signin (started → succeeded) === */}
      <section>
        <header className="mb-4">
          <Eyebrow className="mb-2">─ funnel signin ─</Eyebrow>
          <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
            Authentification — {wizardUmami.rangeDays} derniers jours
          </h2>
          <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-ink-500">
            Tentatives qui aboutissent à une session valide. Magic-link et email/password comptent ;
            Google n&rsquo;émet pas le `_succeeded` côté form.
          </p>
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            label="Tentatives (started)"
            value={funnel.started.toLocaleString("fr-FR")}
            sub="Submit handler déclenché"
          />
          <Kpi
            label="Sessions ouvertes (succeeded)"
            value={funnel.succeeded.toLocaleString("fr-FR")}
            sub={
              funnel.started > 0 ? `${pct(funnel.succeeded, funnel.started)} des tentatives` : "—"
            }
            tone={completionTone}
          />
          <Kpi
            label="Signup créés"
            value={(newAccount?.signup ?? 0).toLocaleString("fr-FR")}
            sub={
              newAccount && newAccount.total > 0
                ? `${pct(newAccount.signup, newAccount.total)} des succès`
                : "—"
            }
          />
          <Kpi
            label="Signin (retours)"
            value={(newAccount?.signin ?? 0).toLocaleString("fr-FR")}
            sub={
              newAccount && newAccount.total > 0
                ? `${pct(newAccount.signin, newAccount.total)} des succès`
                : "—"
            }
          />
        </div>
      </section>

      {/* === Méthodes utilisées === */}
      {methods && methods.total > 0 && (
        <section>
          <header className="mb-4">
            <Eyebrow className="mb-2">─ méthodes ─</Eyebrow>
            <h2 className="text-[24px] leading-tight font-black tracking-[-0.025em] text-ink-700">
              Canaux d&rsquo;authentification
            </h2>
            <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-ink-500">
              Sur les sessions ouvertes ({methods.total}). La part Google est sous-estimée (cf.
              limite ci-dessus).
            </p>
          </header>
          <div className="flex flex-col gap-2 rounded-xl border border-surface-400 bg-surface-100 p-4">
            <ul className="flex flex-col gap-1.5">
              {(
                [
                  ["magic_link", "Lien magique", methods.magicLink],
                  ["email_password", "Email / mot de passe", methods.emailPassword],
                  ["google", "Google OAuth", methods.google],
                  ["unknown", "Inconnu", methods.unknown],
                ] as const
              ).map(([key, label, value]) => {
                if (key === "unknown" && value === 0) {
                  return null;
                }
                const ratio = value / methods.total;
                return (
                  <li key={key} className="flex items-center gap-3">
                    <span className="w-44 font-mono text-[11.5px] text-ink-500">{label}</span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-surface-200">
                      <div
                        className="h-full bg-acid-600/80"
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
        </section>
      )}
    </div>
  );
}
