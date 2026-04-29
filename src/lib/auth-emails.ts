/**
 * Templates d'email transactionnels brandés par produit. Le `from:`
 * reste `hello@colist.fr` pour les deux marques (1 domaine vérifié
 * Resend, partage du DKIM/SPF/DMARC), seuls le subject + le HTML
 * varient.
 *
 * Détection : on regarde l'origin du `url` que Better Auth passe au
 * callback `sendMagicLink` / `sendResetPassword` /
 * `sendVerificationEmail`. Avec `baseURL: { allowedHosts }`, BA
 * utilise le host de la requête entrante, donc l'URL contient
 * `sortie.colist.fr` quand l'utilisateur a démarré son flow auth
 * depuis Sortie.
 *
 * Note typo : les fonts custom (Unbounded, JetBrains Mono) ne se
 * chargent PAS dans les clients mail (Gmail / Outlook / Apple Mail
 * blockent les Google Fonts pour la sécurité). On déclare la stack
 * souhaitée dans `font-family` et le client retombe sur
 * `sans-serif` / `monospace`. Le visuel reste correct grâce aux
 * couleurs + au layout — les gros titres en bold sans-serif lisent
 * comme une display.
 */

const SORTIE_HOST_SUFFIXES = ["sortie.colist.fr", "sortie.localhost"];

export function isSortieOrigin(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return SORTIE_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

export type SortieEmailKind = "magic-link" | "reset-password" | "email-verification";

type Copy = {
  subject: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  footer: string;
};

const sortieCopy: Record<SortieEmailKind, Copy> = {
  "magic-link": {
    subject: "Ton lien Sortie",
    eyebrow: "lien magique",
    title: "Reviens.",
    body: "Tape sur le bouton et tu seras connecté·e direct. Pas de mot de passe à taper, pas de tournée à faire.",
    cta: "Me connecter",
    footer:
      "Ce lien expire dans quelques minutes. Tu n'as pas demandé ça ? Ignore cet email — ton compte ne bouge pas.",
  },
  "reset-password": {
    subject: "Reset ton mot de passe Sortie",
    eyebrow: "reset password",
    title: "Nouveau mdp.",
    body: "Clique pour choisir un nouveau mot de passe. Le lien expire dans 1 heure.",
    cta: "Reset mon mdp",
    footer: "Tu n'as pas demandé ce reset ? Ignore cet email — rien ne change.",
  },
  "email-verification": {
    subject: "Vérifie ton email Sortie",
    eyebrow: "verification",
    title: "Une dernière étape.",
    body: "Confirme que c'est bien ton email pour finaliser ton compte.",
    cta: "Vérifier mon email",
    footer: "Ce lien expire dans 24 heures.",
  },
};

export function buildSortieAuthEmail(args: { kind: SortieEmailKind; ctaUrl: string }): {
  subject: string;
  html: string;
} {
  const c = sortieCopy[args.kind];
  return {
    subject: c.subject,
    html: renderSortieTemplate({ ...c, ctaUrl: args.ctaUrl }),
  };
}

/**
 * Email post-claim : envoyé à un invité qui a donné son email après avoir
 * RSVP à ≥2 sorties d'un organisateur. Tient la promesse "voici tes
 * sorties chez X + lien pour t'y connecter" annoncée dans la prompt — le
 * magic-link Better Auth standard ne l'aurait pas fait (subject + corps
 * trop génériques face à un user qui vient d'engager).
 */
export function buildSortieClaimPromptEmail(args: {
  ctaUrl: string;
  creatorName: string;
  outings: { title: string; dateStr: string | null }[];
}): { subject: string; html: string } {
  const safeCreator = args.creatorName.trim() || "ton organisateur";
  const subject = "Bienvenue sur Sortie";
  const list =
    args.outings.length > 0
      ? `<p style="margin:0 0 12px 0;font-family:'JetBrains Mono','Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#A0A0A0;">─ tes sorties chez ${escapeHtml(
          safeCreator
        )} ─</p>` +
        `<ul style="margin:0 0 28px 0;padding:0 0 0 18px;color:#A0A0A0;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.6;">${args.outings
          .map(
            (o) =>
              `<li style="margin:0 0 6px 0;"><span style="color:#F5F2EB;font-weight:600;">${escapeHtml(
                o.title
              )}</span>${o.dateStr ? ` · <span style="color:#A0A0A0;">${escapeHtml(o.dateStr)}</span>` : ""}</li>`
          )
          .join("")}</ul>`
      : "";
  const eyebrow = "bienvenue";
  const title = "Bienvenue sur Sortie.";
  const body =
    "Tape sur le bouton et tu retrouves tes réponses sur tous tes devices, tu reçois les rappels la veille, et ton agenda se synchronise tout seul. Et pourquoi pas lancer la prochaine ?";
  const cta = "Me connecter";
  const footer = "Ce lien expire dans quelques minutes. Tu n'as pas demandé ça ? Ignore cet email.";
  return {
    subject,
    html: renderSortieTemplate({
      subject,
      eyebrow,
      title,
      body,
      cta,
      ctaUrl: args.ctaUrl,
      footer,
      extraBeforeCta: list,
    }),
  };
}

function renderSortieTemplate(c: Copy & { ctaUrl: string; extraBeforeCta?: string }): string {
  // HTML email-safe : tables imbriquées, styles inline, pas de
  // CSS variables (Outlook). Les couleurs hex viennent du tailwind
  // config (`acid-600 = #C7FF3C`, `hot-500 = #FF3D81`,
  // `surface-50 = #0F0F0F` pour le bg, `ink-700 = #F5F2EB`).
  //
  // Dark mode : Gmail, Apple Mail, Outlook ré-inversent les couleurs
  // si on ne déclare pas explicitement le color-scheme. La combo
  // `<meta name="color-scheme">` + `supported-color-schemes` + le
  // CSS `@media (prefers-color-scheme: dark)` est le pattern
  // standard 2024 pour forcer un rendu dark fidèle à la charte. La
  // class `[data-ogsc]` cible spécifiquement Outlook.com qui ne
  // respecte ni les hex inline ni les media queries.
  return `<!DOCTYPE html>
<html lang="fr" style="color-scheme: dark; background:#0A0A0A;">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>${escapeHtml(c.subject)}</title>
    <style>
      :root { color-scheme: dark; supported-color-schemes: dark; }
      body, table, td { background-color: #0A0A0A !important; }
      [data-ogsc] body, [data-ogsc] table, [data-ogsc] td { background-color: #0A0A0A !important; }
      [data-ogsc] .sortie-title { color: #F5F2EB !important; }
      [data-ogsc] .sortie-body { color: #A0A0A0 !important; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#0A0A0A;color:#F5F2EB;color-scheme:dark;-webkit-text-size-adjust:100%;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0A0A0A;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
            <tr>
              <td style="padding:0 0 28px 0;font-family:'JetBrains Mono','Courier New',monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#FF3D81;font-weight:600;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#FF3D81;vertical-align:middle;margin-right:8px;"></span>
                ─ ${escapeHtml(c.eyebrow)} ─
              </td>
            </tr>
            <tr>
              <td class="sortie-title" style="padding:0 0 24px 0;font-family:'Unbounded','Helvetica Neue',Arial,sans-serif;font-size:48px;line-height:0.95;font-weight:900;letter-spacing:-0.04em;color:#F5F2EB;">
                ${escapeHtml(c.title)}
              </td>
            </tr>
            <tr>
              <td class="sortie-body" style="padding:0 0 24px 0;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.55;color:#A0A0A0;">
                ${escapeHtml(c.body)}
              </td>
            </tr>
            ${
              c.extraBeforeCta
                ? `<tr><td style="padding:0 0 8px 0;">${c.extraBeforeCta}</td></tr>`
                : ""
            }
            <tr>
              <td style="padding:0 0 40px 0;">
                <a href="${escapeAttr(c.ctaUrl)}" style="display:inline-block;padding:14px 28px;background:#C7FF3C;color:#0A0A0A;text-decoration:none;border-radius:999px;font-family:'Unbounded','Helvetica Neue',Arial,sans-serif;font-weight:800;font-size:15px;letter-spacing:-0.01em;">
                  ${escapeHtml(c.cta)} →
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 16px 0;border-top:1px solid #1F1F1F;"></td>
            </tr>
            <tr>
              <td style="padding:0;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.55;color:#636366;">
                ↳ ${escapeHtml(c.footer)}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 0 0 0;font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:#444;">
                sortie · v0.1
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  // URL d'href : l'URL elle-même n'a pas besoin d'être HTML-escaped
  // si elle vient d'un input contrôlé (Better Auth génère le token
  // alphanumérique), mais on encode quand même les guillemets pour
  // ne pas casser l'attribut.
  return s.replace(/"/g, "%22");
}
