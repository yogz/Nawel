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
 * Layout : aligné sur les emails ops Sortie (light theme Acid Cabinet
 * — `renderEmail()` du layout partagé). Avant cette unification, les
 * emails auth utilisaient un layout sombre dédié, ce qui faisait
 * recevoir au user "deux apps" différentes entre son magic-link et
 * son rappel J-1. Le light l'emporte parce que c'est le layout
 * majoritaire (10 templates) et le ton de la home Sortie.
 */

import { escapeHtml } from "./html-escape";
import { renderEmail } from "@/features/sortie/lib/emails/layout";

const SORTIE_HOST_SUFFIXES = ["sortie.colist.fr", "sortie.localhost"];

export function isSortieOrigin(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return SORTIE_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

// Acid Cabinet email tokens (light) — dupliqués depuis templates.ts
// pour éviter d'exporter des constantes privées. Si on en ajoute un
// 3ᵉ consommateur on les centralisera dans layout.ts.
const INK = "#0A0A0A";
const INK_BODY = "#3A3833";
const INK_MUTED = "#7A7368";
const ACID = "#C7FF3C";
const HOT = "#FF3D81";
const HAIRLINE = "rgba(10,10,10,0.08)";

const H1 = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:30px;line-height:1.1;letter-spacing:-0.03em;font-weight:800;color:${INK};`;
const BODY_P = `color:${INK_BODY};line-height:1.6;font-size:15px;`;
const MICRO_TAG = `font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;color:${HOT};`;
const FOOTER_P = `font-size:13px;color:${INK_MUTED};line-height:1.6;`;

function ctaButton(href: string, label: string): string {
  return `<a href="${escapeAttr(href)}" style="display:inline-block;padding:14px 26px;background:${INK};color:${ACID};text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;letter-spacing:0.01em;">${escapeHtml(label)}</a>`;
}

function escapeAttr(s: string): string {
  // L'URL d'href vient d'un input contrôlé (Better Auth génère le
  // token alphanumérique), mais on encode quand même les guillemets
  // pour ne pas casser l'attribut.
  return s.replace(/"/g, "%22");
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
    html: renderAuthBody({ ...c, ctaUrl: args.ctaUrl }),
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
      ? `<p style="margin:0 0 12px;${MICRO_TAG}">─ tes sorties chez ${escapeHtml(safeCreator)} ─</p>` +
        `<ul style="margin:0 0 8px;padding:0;list-style:none;">${args.outings
          .map(
            (o) => `
              <li style="padding:10px 0;border-bottom:1px solid ${HAIRLINE};${BODY_P}">
                <span style="color:${INK};font-weight:600;">${escapeHtml(o.title)}</span>${
                  o.dateStr
                    ? ` · <span style="color:${INK_MUTED};">${escapeHtml(o.dateStr)}</span>`
                    : ""
                }
              </li>`
          )
          .join("")}</ul>`
      : "";
  return {
    subject,
    html: renderAuthBody({
      subject,
      eyebrow: "bienvenue",
      title: "Bienvenue sur Sortie.",
      body: "Tape sur le bouton et tu retrouves tes réponses sur tous tes devices, tu reçois les rappels la veille, et ton agenda se synchronise tout seul. Et pourquoi pas lancer la prochaine ?",
      cta: "Me connecter",
      ctaUrl: args.ctaUrl,
      footer: "Ce lien expire dans quelques minutes. Tu n'as pas demandé ça ? Ignore cet email.",
      extraBeforeCta: list,
    }),
  };
}

/**
 * Email follow-gate : envoyé à un user logué non-vérifié qui tente de
 * follow un créateur depuis `/@<creator>?k=<token>`. Tient la promesse
 * "confirme ton email pour entrer dans le réseau" du upsell — le magic-
 * link générique aurait perdu le contexte de l'action en cours.
 */
export function buildSortieFollowGateEmail(args: { ctaUrl: string; creatorName: string }): {
  subject: string;
  html: string;
} {
  const safeCreator = args.creatorName.trim() || "ce créateur";
  const subject = `Confirme ton email pour suivre ${safeCreator}`;
  return {
    subject,
    html: renderAuthBody({
      subject,
      eyebrow: "suivre",
      title: `Suis ${safeCreator}.`,
      body: "Confirme ton email pour activer ton suivi. Tu recevras les nouvelles sorties dès qu'elles se posent dans son agenda, et un rappel la veille de chacune.",
      cta: "Confirmer mon email",
      ctaUrl: args.ctaUrl,
      footer: "Ce lien expire dans quelques minutes. Tu n'as pas demandé ça ? Ignore cet email.",
    }),
  };
}

/**
 * Construit un body Acid Cabinet light puis le passe à `renderEmail()`
 * pour le wrap final (DOCTYPE, head, eyebrow "● Sortie", footer
 * institutionnel). Ce body local porte l'eyebrow secondaire (kind du
 * mail), le H1, le paragraphe principal, l'éventuel `extraBeforeCta`
 * (liste de sorties pour claim-prompt), le CTA, et le footer.
 */
function renderAuthBody(c: Copy & { ctaUrl: string; extraBeforeCta?: string }): string {
  const body = `
    <p style="margin:0 0 8px;${MICRO_TAG}">─ ${escapeHtml(c.eyebrow)} ─</p>
    <h1 style="margin:0 0 14px;${H1}">${escapeHtml(c.title)}</h1>
    <p style="margin:0 0 18px;${BODY_P}">${escapeHtml(c.body)}</p>
    ${c.extraBeforeCta ?? ""}
    <p style="margin:28px 0;">${ctaButton(c.ctaUrl, c.cta)}</p>
    <p style="margin:0;${FOOTER_P}">↳ ${escapeHtml(c.footer)}</p>
  `;
  return renderEmail({ preheader: c.body, body });
}
