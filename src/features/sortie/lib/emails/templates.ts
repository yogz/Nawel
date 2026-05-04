import { escapeHtml } from "@/lib/html-escape";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";
import { renderEmail } from "./layout";

export type PaymentMethodPreview = {
  type: "iban" | "lydia" | "revolut" | "wero";
  valuePreview: string;
  displayLabel: string | null;
};

// Acid Cabinet email tokens — kept here so every template pulls from the
// same swatch and a future palette tweak is a one-file edit.
const INK = "#0A0A0A";
const INK_BODY = "#3A3833";
const INK_MUTED = "#7A7368";
const ACID = "#C7FF3C";
const HOT = "#FF3D81";
const HAIRLINE = "rgba(10,10,10,0.08)";

const H1 = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:30px;line-height:1.1;letter-spacing:-0.03em;font-weight:800;color:${INK};`;
const BODY_P = `color:${INK_BODY};line-height:1.6;font-size:15px;`;
const MICRO_TAG = `font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;color:${HOT};`;

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function ctaButton(href: string, label: string): string {
  // Noir solide + acid green : ratio ~14:1, lit comme un tampon. Seul
  // type de CTA dans tous les emails Sortie — cohérence visuelle prime
  // sur la nuance "action requise / juste un retour" qu'on faisait
  // avant via un `textLink` rose dédié pour les emails de closure.
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 26px;background:${INK};color:${ACID};text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;letter-spacing:0.01em;">${escapeHtml(label)}</a>`;
}

function methodsBlock(methods: PaymentMethodPreview[]): string {
  if (methods.length === 0) {
    return `<p style="color:${INK_MUTED};font-size:13px;">Aucun moyen de paiement renseigné pour l&rsquo;instant.</p>`;
  }
  const rows = methods
    .map((m) => {
      const label = m.displayLabel ? ` · ${escapeHtml(m.displayLabel)}` : "";
      return `<li style="list-style:none;padding:10px 0;border-bottom:1px solid ${HAIRLINE};">
        <span style="${MICRO_TAG}">${escapeHtml(m.type.toUpperCase())}${label}</span><br />
        <span style="font-family:ui-monospace,Menlo,monospace;color:${INK};font-size:14px;">${escapeHtml(m.valuePreview)}</span>
      </li>`;
    })
    .join("");
  return `<ul style="margin:8px 0 0;padding:0;">${rows}</ul>`;
}

/**
 * Sent to each non-buyer "yes" participant right after the buyer declares
 * the purchase. Carries their personal debt amount and the buyer's masked
 * payment-method previews — the full values stay behind the reveal action.
 */
export function purchaseConfirmedEmail(args: {
  outingTitle: string;
  outingDate: Date | null;
  buyerName: string;
  debtorName: string;
  amountCents: number;
  outingUrl: string;
  debtsUrl: string;
  methods: PaymentMethodPreview[];
}): { subject: string; html: string } {
  const title = escapeHtml(args.outingTitle);
  const dateLine = args.outingDate
    ? ` le ${escapeHtml(formatOutingDateConversational(args.outingDate))}`
    : "";
  const body = `
    <h1 style="margin:0 0 14px;${H1}">Les billets sont pris</h1>
    <p style="margin:0 0 18px;${BODY_P}">
      ${escapeHtml(args.buyerName)} a pris les places pour <strong>${title}</strong>${dateLine}.
      Ta part&nbsp;: <strong>${escapeHtml(formatCents(args.amountCents))}</strong>.
    </p>
    <p style="margin:0 0 8px;${MICRO_TAG}">Moyens de paiement</p>
    ${methodsBlock(args.methods)}
    <p style="margin:28px 0;">
      ${ctaButton(args.debtsUrl, "Régler ma part")}
    </p>
    <p style="margin:0;font-size:13px;color:${INK_MUTED};line-height:1.6;">
      Une fois le virement parti, tape « j&rsquo;ai payé » pour que ${escapeHtml(args.buyerName)} confirme la réception.
    </p>
  `;
  return {
    subject: `${formatCents(args.amountCents)} pour ${args.outingTitle}`,
    html: renderEmail({
      preheader: `${args.buyerName} a pris les billets. Ta part : ${formatCents(args.amountCents)}.`,
      body,
    }),
  };
}

/**
 * Sent to the creditor (buyer) when a debtor taps "J'ai payé". Keeps the
 * tone neutral — the creditor still has to eyeball their bank app before
 * confirming, so this isn't a receipt.
 */
export function paymentDeclaredEmail(args: {
  outingTitle: string;
  debtorName: string;
  amountCents: number;
  debtsUrl: string;
}): { subject: string; html: string } {
  const title = escapeHtml(args.outingTitle);
  const body = `
    <h1 style="margin:0 0 14px;${H1}">${escapeHtml(args.debtorName)} dit avoir payé</h1>
    <p style="margin:0 0 18px;${BODY_P}">
      Pour <strong>${title}</strong> — <strong>${escapeHtml(formatCents(args.amountCents))}</strong>.
    </p>
    <p style="margin:0 0 28px;${BODY_P}">
      Vérifie que le virement est bien arrivé, puis confirme la réception. Tout le monde sera au clair.
    </p>
    <p style="margin:0;">
      ${ctaButton(args.debtsUrl, "Confirmer la réception")}
    </p>
  `;
  return {
    subject: `${args.debtorName} a indiqué avoir payé ${formatCents(args.amountCents)}`,
    html: renderEmail({
      preheader: `${args.debtorName} dit avoir réglé ${formatCents(args.amountCents)} pour ${args.outingTitle}.`,
      body,
    }),
  };
}

/**
 * Sent to the debtor when the creditor taps "Relancer par email". Tone
 * léger volontaire — c'est entre potes, pas un recouvrement. Rate-limit
 * 1×/48h appliqué côté Server Action via audit_log pour éviter le spam.
 */
export function debtReminderEmail(args: {
  outingTitle: string;
  creditorName: string;
  amountCents: number;
  debtsUrl: string;
}): { subject: string; html: string } {
  const title = escapeHtml(args.outingTitle);
  const body = `
    <h1 style="margin:0 0 14px;${H1}">Petit rappel</h1>
    <p style="margin:0 0 18px;${BODY_P}">
      ${escapeHtml(args.creditorName)} attend toujours ta part pour <strong>${title}</strong> —
      <strong>${escapeHtml(formatCents(args.amountCents))}</strong>.
    </p>
    <p style="margin:0 0 28px;${BODY_P}">
      Tu peux régler en deux taps depuis la page dettes. Une fois le virement parti, tape « j&rsquo;ai payé » pour fermer la boucle.
    </p>
    <p style="margin:0;">
      ${ctaButton(args.debtsUrl, "Régler ma part")}
    </p>
  `;
  return {
    subject: `Rappel — ${formatCents(args.amountCents)} pour ${args.outingTitle}`,
    html: renderEmail({
      preheader: `${args.creditorName} te rappelle ta part de ${formatCents(args.amountCents)}.`,
      body,
    }),
  };
}

/**
 * Sent to the debtor once the creditor confirmed receipt — "c'est bouclé".
 * No CTA, just closure.
 */
export function paymentConfirmedEmail(args: {
  outingTitle: string;
  creditorName: string;
  amountCents: number;
  outingUrl: string;
}): { subject: string; html: string } {
  const title = escapeHtml(args.outingTitle);
  const body = `
    <h1 style="margin:0 0 14px;${H1}">C&rsquo;est réglé</h1>
    <p style="margin:0 0 18px;${BODY_P}">
      ${escapeHtml(args.creditorName)} a confirmé avoir reçu les <strong>${escapeHtml(formatCents(args.amountCents))}</strong> pour <strong>${title}</strong>. Merci.
    </p>
    <p style="margin:28px 0 0;">
      ${ctaButton(args.outingUrl, "Retour à la sortie")}
    </p>
  `;
  return {
    subject: `${args.outingTitle} — c'est réglé`,
    html: renderEmail({
      preheader: `${args.creditorName} a confirmé ta part de ${formatCents(args.amountCents)}.`,
      body,
    }),
  };
}

/**
 * Sent to the outing creator when someone RSVPs. Includes the response type
 * and any +1 counts so the organizer can eyeball the headcount from their
 * inbox without reloading the page.
 */
export function rsvpReceivedEmail(args: {
  outingTitle: string;
  outingUrl: string;
  responderName: string;
  response: "yes" | "no" | "handle_own";
  extraAdults: number;
  extraChildren: number;
}): { subject: string; html: string } {
  const title = escapeHtml(args.outingTitle);
  const name = escapeHtml(args.responderName);
  const label =
    args.response === "yes" ? "dit oui" : args.response === "no" ? "dit non" : "prend sa place";
  const guests: string[] = [];
  if (args.extraAdults > 0) {
    guests.push(`+${args.extraAdults} adulte${args.extraAdults > 1 ? "s" : ""}`);
  }
  if (args.extraChildren > 0) {
    guests.push(`+${args.extraChildren} enfant${args.extraChildren > 1 ? "s" : ""}`);
  }
  const guestsLine = guests.length > 0 ? ` (${guests.join(", ")})` : "";

  const body = `
    <h1 style="margin:0 0 14px;${H1}">${name} ${label}</h1>
    <p style="margin:0 0 18px;${BODY_P}">
      Pour <strong>${title}</strong>${guestsLine}.
    </p>
    <p style="margin:28px 0 0;">
      ${ctaButton(args.outingUrl, "Voir les réponses")}
    </p>
  `;
  return {
    subject: `${args.responderName} ${label}`,
    html: renderEmail({
      preheader: `${args.responderName} ${label}${guestsLine} pour ${args.outingTitle}.`,
      body,
    }),
  };
}

/**
 * Sent to every non-"no" RSVP when the creator cancels the outing. Tone
 * stays neutral but not robotic — "on se rattrape au prochain".
 */
export function outingCancelledEmail(args: { outingTitle: string; homeUrl: string }): {
  subject: string;
  html: string;
} {
  const title = escapeHtml(args.outingTitle);
  const body = `
    <h1 style="margin:0 0 14px;${H1}">${title} est annulée</h1>
    <p style="margin:0 0 18px;${BODY_P}">
      La sortie ne se fera pas. On se rattrape au prochain.
    </p>
    <p style="margin:28px 0 0;">
      ${ctaButton(args.homeUrl, "Accueil Sortie")}
    </p>
  `;
  return {
    subject: `${args.outingTitle} — annulée`,
    html: renderEmail({
      preheader: `${args.outingTitle} a été annulée.`,
      body,
    }),
  };
}

/**
 * Fired to every non-"no" participant when the creator picks a winning
 * timeslot on a vote-mode outing. Voters who said available on that slot
 * read "tu es confirmé·e"; voters who didn't vote on it read "tu dois
 * reconfirmer". The recipient's own derived state isn't embedded here —
 * this is a single template that reads well for both cases.
 */
export function timeslotPickedEmail(args: {
  outingTitle: string;
  outingUrl: string;
  fixedDatetime: Date;
  location: string | null;
}): { subject: string; html: string } {
  const title = escapeHtml(args.outingTitle);
  const when = escapeHtml(formatOutingDateConversational(args.fixedDatetime));
  const locationLine = args.location
    ? `<br /><span style="color:${INK_MUTED};">${escapeHtml(args.location)}</span>`
    : "";
  const body = `
    <h1 style="margin:0 0 14px;${H1}">On a une date</h1>
    <p style="margin:0 0 18px;${BODY_P}">
      <strong>${title}</strong>${locationLine}
    </p>
    <p style="margin:0 0 18px;${BODY_P}">
      Créneau retenu&nbsp;: <strong>${when}</strong>.
    </p>
    <p style="margin:0 0 28px;${BODY_P}">
      Si tu avais voté pour ce créneau, t&rsquo;es dedans. Sinon, redis-nous vite si tu peux.
    </p>
    <p style="margin:0;">
      ${ctaButton(args.outingUrl, "Voir la sortie")}
    </p>
  `;
  return {
    subject: `${args.outingTitle} — ${when}`,
    html: renderEmail({
      preheader: `Le créneau a été choisi : ${when}.`,
      body,
    }),
  };
}

/**
 * Fired once per outing by the hourly sweeper the moment the RSVP deadline
 * is crossed. Reaches only confirmed attendees (yes + handle_own) so no-shows
 * don't get a useless ping.
 */
export function rsvpClosedEmail(args: {
  outingTitle: string;
  outingUrl: string;
  fixedDatetime: Date | null;
  location: string | null;
  /** Sondage non tranché à la cloture (mode=vote, chosenTimeslotId=null).
   * Quand true, on remplace la phrase « rdv à la date prévue » (faux —
   * il n'y a pas encore de date) par un message qui dit clairement
   * que l'orga doit choisir un créneau parmi les votes. Le user reçoit
   * le mail de date définitive (`pollResolvedEmail`) plus tard. */
  awaitingPick?: boolean;
}): { subject: string; html: string } {
  const title = escapeHtml(args.outingTitle);
  const locationLine = args.location
    ? ` · <span style="color:${INK_BODY};">${escapeHtml(args.location)}</span>`
    : "";

  let closingLine: string;
  let preheader: string;
  if (args.awaitingPick) {
    closingLine = `Les votes sont figés, plus de changement possible. L&rsquo;orga va choisir un créneau parmi ceux qui ont remporté le plus d&rsquo;avis — tu recevras un mail dès que la date est tranchée.`;
    preheader = `Votes figés. L'orga choisit le créneau bientôt.`;
  } else if (args.fixedDatetime) {
    const when = formatOutingDateConversational(args.fixedDatetime);
    closingLine = `La deadline est passée, plus personne ne peut répondre. Rendez-vous <strong>${escapeHtml(when)}</strong>${locationLine}.`;
    preheader = `La liste est close. ${when}.`;
  } else {
    closingLine = `La deadline est passée, plus personne ne peut répondre. Rendez-vous à la date prévue${locationLine}.`;
    preheader = `La liste est close. À bientôt.`;
  }

  const body = `
    <h1 style="margin:0 0 14px;${H1}">${title} — la liste est close</h1>
    <p style="margin:0 0 18px;${BODY_P}">
      ${closingLine}
    </p>
    <p style="margin:28px 0 0;">
      ${ctaButton(args.outingUrl, "Voir la sortie")}
    </p>
  `;

  return {
    subject: `${args.outingTitle} — la liste est close`,
    html: renderEmail({ preheader, body }),
  };
}

/**
 * Fired exactly once per outing by the sweeper when fixedDatetime is ~24h
 * away. Idempotency enforced by the reminder_j1_sent_at timestamp — if
 * this email fails to send, we still stamp (we don't want to retry forever
 * and a missed reminder is better than a duplicated one).
 */
export function j1ReminderEmail(args: {
  outingTitle: string;
  outingUrl: string;
  fixedDatetime: Date;
  location: string | null;
}): { subject: string; html: string } {
  const title = escapeHtml(args.outingTitle);
  const when = escapeHtml(formatOutingDateConversational(args.fixedDatetime));
  const locationLine = args.location
    ? `<br /><span style="color:${INK_MUTED};">${escapeHtml(args.location)}</span>`
    : "";
  const body = `
    <h1 style="margin:0 0 14px;${H1}">C&rsquo;est demain</h1>
    <p style="margin:0 0 18px;${BODY_P}">
      <strong>${title}</strong>${locationLine}
    </p>
    <p style="margin:0 0 28px;${BODY_P}">
      ${when}. À demain.
    </p>
    <p style="margin:0;">
      ${ctaButton(args.outingUrl, "Détails de la sortie")}
    </p>
  `;
  return {
    subject: `Demain — ${args.outingTitle}`,
    html: renderEmail({
      preheader: `${args.outingTitle} c'est demain. ${when}.`,
      body,
    }),
  };
}

/**
 * Sent to the creator the first time someone follows them. Heads-up only —
 * le destinataire n'a rien à faire. Le CTA pointe vers /moi pour qu'il
 * puisse jeter un œil à sa liste de suiveurs (et en retirer un si besoin).
 */
export function newFollowerEmail(args: {
  followedName: string;
  followerName: string;
  manageUrl: string;
}): { subject: string; html: string } {
  const follower = escapeHtml(args.followerName);
  const body = `
    <h1 style="margin:0 0 14px;${H1}">${follower} te suit</h1>
    <p style="margin:0 0 18px;${BODY_P}">
      ${follower} verra tes prochaines sorties et pourra y répondre directement, sans repasser par ton lien privé.
    </p>
    <p style="margin:0 0 28px;${BODY_P}">
      Rien à faire de ton côté — c'est juste pour info.
    </p>
    <p style="margin:0;">
      ${ctaButton(args.manageUrl, "Gérer mes suiveurs")}
    </p>
  `;
  return {
    subject: `${args.followerName} te suit sur Sortie`,
    html: renderEmail({
      preheader: `${args.followerName} a commencé à suivre tes sorties.`,
      body,
    }),
  };
}

/**
 * Sent to every non-"no" RSVP when the creator edits a material field (title,
 * date, venue, deadline, or ticket URL). Lists only the fields that actually
 * changed so the reader doesn't have to diff the email against memory.
 */
export function outingModifiedEmail(args: {
  outingTitle: string;
  outingUrl: string;
  changes: Array<{ label: string; before: string | null; after: string | null }>;
}): { subject: string; html: string } {
  const title = escapeHtml(args.outingTitle);
  const rows = args.changes
    .map(
      (c) => `
      <li style="list-style:none;padding:10px 0;border-bottom:1px solid ${HAIRLINE};">
        <span style="${MICRO_TAG}">${escapeHtml(c.label)}</span><br />
        <span style="color:${INK_MUTED};text-decoration:line-through;">${c.before ? escapeHtml(c.before) : "—"}</span><br />
        <span style="color:${INK};font-weight:600;">${c.after ? escapeHtml(c.after) : "—"}</span>
      </li>`
    )
    .join("");

  const body = `
    <h1 style="margin:0 0 14px;${H1}">${title} a changé</h1>
    <p style="margin:0 0 18px;${BODY_P}">
      ${args.changes.length > 1 ? "Quelques changements" : "Un changement"} dans la sortie&nbsp;:
    </p>
    <ul style="margin:8px 0 28px;padding:0;">${rows}</ul>
    <p style="margin:0;">
      ${ctaButton(args.outingUrl, "Revoir la sortie")}
    </p>
  `;
  return {
    subject: `${args.outingTitle} — mise à jour`,
    html: renderEmail({
      preheader: `${args.changes.map((c) => c.label).join(", ")} ont changé.`,
      body,
    }),
  };
}

/**
 * Sent right after the organiser uploads a ticket. Two flavours :
 *   - `participant` : un fichier nominatif pour ce destinataire précis
 *   - `outing` : un fichier groupé partagé avec toute la sortie
 *
 * Le CTA pointe sur la page billets, pas directement sur le download —
 * comme ça le destinataire passe par la session Better Auth, pas un
 * lien magique éphémère côté billet (le lien resterait valide après
 * révocation du billet, mauvais signal). La page redirige vers signin
 * si l'email n'est pas encore vérifié, et l'auto-claim relie son
 * userId au participant via `databaseHooks.session.create.after`.
 */
export function ticketAvailableEmail(args: {
  outingTitle: string;
  outingDate: Date | null;
  ticketsUrl: string;
  scope: "participant" | "outing";
  recipientName: string;
}): { subject: string; html: string } {
  const title = escapeHtml(args.outingTitle);
  const dateLine = args.outingDate
    ? ` le ${escapeHtml(formatOutingDateConversational(args.outingDate))}`
    : "";
  const headline =
    args.scope === "participant" ? "Ton billet est prêt" : "Le billet groupé est prêt";
  const intro =
    args.scope === "participant"
      ? `Un billet nominatif vient d&rsquo;être déposé pour toi sur <strong>${title}</strong>${dateLine}.`
      : `Un billet groupé vient d&rsquo;être déposé sur <strong>${title}</strong>${dateLine}, partagé avec toute la sortie.`;
  const body = `
    <h1 style="margin:0 0 14px;${H1}">${escapeHtml(headline)}</h1>
    <p style="margin:0 0 18px;${BODY_P}">
      Salut ${escapeHtml(args.recipientName)} — ${intro}
    </p>
    <p style="margin:0 0 18px;${BODY_P}">
      Connecte-toi à Sortie avec l&rsquo;email auquel tu reçois ce mail pour le récupérer.
      Le fichier reste chiffré côté serveur tant que tu n&rsquo;as pas cliqué.
    </p>
    <p style="margin:28px 0;">
      ${ctaButton(args.ticketsUrl, "Récupérer mon billet")}
    </p>
    <p style="margin:0;font-size:13px;color:${INK_MUTED};line-height:1.6;">
      Pour des raisons de sécurité, on ne joint jamais les billets directement à un email —
      seul ton compte vérifié y donne accès.
    </p>
  `;
  return {
    subject: `${args.outingTitle} — billet disponible`,
    html: renderEmail({
      preheader:
        args.scope === "participant"
          ? `Ton billet pour ${args.outingTitle} est prêt à télécharger.`
          : `Le billet groupé pour ${args.outingTitle} est prêt.`,
      body,
    }),
  };
}
