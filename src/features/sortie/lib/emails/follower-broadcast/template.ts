import { escapeHtml } from "@/lib/html-escape";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";
import { renderEmail } from "@/features/sortie/lib/emails/layout";

/**
 * Email envoyé à chaque follower du créateur juste après la création
 * d'une sortie. Le CTA est un magic link Better Auth qui auto-login le
 * follower puis l'envoie sur la page sortie avec `?rsvp=auto` pour pré-
 * ouvrir le sheet RSVP.
 *
 * Les valeurs `outingTitle`, `creatorName`, `location` peuvent contenir
 * du contenu user-controlled — on les escape systématiquement.
 */

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
  return s.replace(/"/g, "%22");
}

export type OutingBroadcastEmailArgs = {
  outingTitle: string;
  creatorName: string;
  /** Date fixe pour mode `fixed`, null pour mode `vote` (créneaux à choisir). */
  startsAt: Date | null;
  location: string | null;
  deadlineAt: Date;
  /** URL Better Auth magic link → callbackURL `/{slug}?rsvp=auto`. */
  magicUrl: string;
  /** URL HMAC one-click pour bascule `notifyOnFollowedOuting=false`. */
  unsubscribeUrl: string;
};

export function buildOutingBroadcastEmail(args: OutingBroadcastEmailArgs): {
  subject: string;
  html: string;
} {
  const title = escapeHtml(args.outingTitle);
  const creator = escapeHtml(args.creatorName);

  const whenText = args.startsAt
    ? formatOutingDateConversational(args.startsAt)
    : "Créneau à choisir";
  const when = escapeHtml(whenText);

  const locationLine = args.location
    ? `<br /><span style="color:${INK_MUTED};">${escapeHtml(args.location)}</span>`
    : "";

  const deadline = escapeHtml(formatOutingDateConversational(args.deadlineAt));

  const subject = `${args.creatorName} organise : ${args.outingTitle}`;
  const preheader = args.location ? `${whenText} · ${args.location}` : whenText;

  const body = `
    <p style="margin:0 0 8px;${MICRO_TAG}">─ nouvelle sortie ─</p>
    <h1 style="margin:0 0 14px;${H1}">${title}</h1>
    <p style="margin:0 0 18px;${BODY_P}">
      ${creator} vient de poser une sortie. <strong>${when}</strong>${locationLine}
    </p>
    <p style="margin:0 0 28px;${BODY_P}">
      RSVP avant&nbsp;: <strong>${deadline}</strong>. Tape le bouton, t&rsquo;es connecté·e direct et tu peux répondre.
    </p>
    <p style="margin:0 0 28px;">
      ${ctaButton(args.magicUrl, "Voir & répondre")}
    </p>
    <hr style="margin:28px 0 18px;border:0;border-top:1px solid ${HAIRLINE};" />
    <p style="margin:0;${FOOTER_P}">
      Tu reçois ce mail parce que tu suis ${creator} sur Sortie.<br />
      <a href="${escapeAttr(args.unsubscribeUrl)}" style="color:${INK_MUTED};text-decoration:underline;">Ne plus recevoir d&rsquo;annonces de nouvelles sorties</a>.
    </p>
  `;

  return {
    subject,
    html: renderEmail({ preheader, body }),
  };
}
