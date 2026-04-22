import { escapeHtml } from "@/lib/html-escape";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";
import { renderEmail } from "./layout";

export type PaymentMethodPreview = {
  type: "iban" | "lydia" | "revolut" | "wero";
  valuePreview: string;
  displayLabel: string | null;
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function ctaButton(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;background:#6B1F2A;color:#F5F1E8;text-decoration:none;border-radius:8px;font-weight:500;">${escapeHtml(label)}</a>`;
}

function methodsBlock(methods: PaymentMethodPreview[]): string {
  if (methods.length === 0) {
    return `<p style="color:#8E8168;font-size:13px;">Aucun moyen de paiement renseigné pour l'instant.</p>`;
  }
  const rows = methods
    .map((m) => {
      const label = m.displayLabel ? ` · ${escapeHtml(m.displayLabel)}` : "";
      return `<li style="list-style:none;padding:8px 0;border-bottom:1px solid #EDE5D2;">
        <span style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#7E6133;">${escapeHtml(m.type.toUpperCase())}${label}</span><br />
        <span style="font-family:ui-monospace,Menlo,monospace;color:#342D22;">${escapeHtml(m.valuePreview)}</span>
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
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:28px;line-height:1.2;color:#231E16;">Les places sont achetées</h1>
    <p style="margin:0 0 16px;color:#4A4132;line-height:1.6;">
      ${escapeHtml(args.buyerName)} a pris les billets pour <strong>${title}</strong>${dateLine}.
      Ta part : <strong>${escapeHtml(formatCents(args.amountCents))}</strong>.
    </p>
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#7E6133;">Moyens de paiement</p>
    ${methodsBlock(args.methods)}
    <p style="margin:24px 0;">
      ${ctaButton(args.debtsUrl, "Régler ma part")}
    </p>
    <p style="margin:0;font-size:13px;color:#8E8168;">
      Tu pourras aussi indiquer « j'ai payé » une fois le virement effectué pour que ${escapeHtml(args.buyerName)} confirme la réception.
    </p>
  `;
  return {
    subject: `${args.outingTitle} — ${formatCents(args.amountCents)} à régler`,
    html: renderEmail({
      preheader: `${args.buyerName} a acheté les billets. Ta part : ${formatCents(args.amountCents)}.`,
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
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#231E16;">${escapeHtml(args.debtorName)} a indiqué avoir payé</h1>
    <p style="margin:0 0 16px;color:#4A4132;line-height:1.6;">
      Pour <strong>${title}</strong> — <strong>${escapeHtml(formatCents(args.amountCents))}</strong>.
    </p>
    <p style="margin:0 0 24px;color:#4A4132;line-height:1.6;">
      Vérifie que le virement est bien arrivé, puis confirme la réception pour que tout le monde soit au clair.
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
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#231E16;">C'est réglé</h1>
    <p style="margin:0 0 16px;color:#4A4132;line-height:1.6;">
      ${escapeHtml(args.creditorName)} a confirmé avoir bien reçu les <strong>${escapeHtml(formatCents(args.amountCents))}</strong> pour <strong>${title}</strong>. Merci.
    </p>
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(args.outingUrl)}" style="color:#6B1F2A;text-decoration:underline;">Retour à la sortie</a>
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
    args.response === "yes"
      ? "a dit oui"
      : args.response === "no"
        ? "ne peut pas venir"
        : "gère sa place";
  const guests: string[] = [];
  if (args.extraAdults > 0) {
    guests.push(`+${args.extraAdults} adulte${args.extraAdults > 1 ? "s" : ""}`);
  }
  if (args.extraChildren > 0) {
    guests.push(`+${args.extraChildren} enfant${args.extraChildren > 1 ? "s" : ""}`);
  }
  const guestsLine = guests.length > 0 ? ` (${guests.join(", ")})` : "";

  const body = `
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#231E16;">${name} ${label}</h1>
    <p style="margin:0 0 16px;color:#4A4132;line-height:1.6;">
      Pour <strong>${title}</strong>${guestsLine}.
    </p>
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(args.outingUrl)}" style="color:#6B1F2A;text-decoration:underline;">Voir les réponses</a>
    </p>
  `;
  return {
    subject: `${args.responderName} ${label} — ${args.outingTitle}`,
    html: renderEmail({
      preheader: `${args.responderName} ${label}${guestsLine} pour ${args.outingTitle}.`,
      body,
    }),
  };
}

/**
 * Sent to every non-"no" RSVP when the creator edits a material field (title,
 * date, venue, deadline, or ticket URL). Lists only the fields that actually
 * changed so the reader doesn't have to diff the email against memory.
 */
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
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#231E16;">${title} est annulée</h1>
    <p style="margin:0 0 16px;color:#4A4132;line-height:1.6;">
      Le créateur a annulé la sortie. On se rattrape au prochain&nbsp;?
    </p>
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(args.homeUrl)}" style="color:#6B1F2A;text-decoration:underline;">Accueil Sortie</a>
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
 * Fired once per outing by the hourly sweeper the moment the RSVP deadline
 * is crossed. Reaches only confirmed attendees (yes + handle_own) so no-shows
 * don't get a useless ping.
 */
export function rsvpClosedEmail(args: {
  outingTitle: string;
  outingUrl: string;
  fixedDatetime: Date | null;
  location: string | null;
}): { subject: string; html: string } {
  const title = escapeHtml(args.outingTitle);
  const dateLine = args.fixedDatetime
    ? `<strong>${escapeHtml(formatOutingDateConversational(args.fixedDatetime))}</strong>`
    : "à la date prévue";
  const locationLine = args.location
    ? ` · <span style="color:#4A4132;">${escapeHtml(args.location)}</span>`
    : "";
  const body = `
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#231E16;">${title} — la liste est arrêtée</h1>
    <p style="margin:0 0 16px;color:#4A4132;line-height:1.6;">
      La deadline est passée, plus personne ne peut répondre. Rendez-vous ${dateLine}${locationLine}.
    </p>
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(args.outingUrl)}" style="color:#6B1F2A;text-decoration:underline;">Voir la sortie</a>
    </p>
  `;
  return {
    subject: `${args.outingTitle} — la liste est arrêtée`,
    html: renderEmail({
      preheader: `La liste est arrêtée. ${args.fixedDatetime ? formatOutingDateConversational(args.fixedDatetime) : "À bientôt"}.`,
      body,
    }),
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
    ? `<br /><span style="color:#8E8168;">${escapeHtml(args.location)}</span>`
    : "";
  const body = `
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#231E16;">C'est demain</h1>
    <p style="margin:0 0 16px;color:#4A4132;line-height:1.6;">
      <strong>${title}</strong>${locationLine}
    </p>
    <p style="margin:0 0 16px;color:#4A4132;line-height:1.6;">
      ${when}. À demain.
    </p>
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(args.outingUrl)}" style="color:#6B1F2A;text-decoration:underline;">Détails de la sortie</a>
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

export function outingModifiedEmail(args: {
  outingTitle: string;
  outingUrl: string;
  changes: Array<{ label: string; before: string | null; after: string | null }>;
}): { subject: string; html: string } {
  const title = escapeHtml(args.outingTitle);
  const rows = args.changes
    .map(
      (c) => `
      <li style="list-style:none;padding:8px 0;border-bottom:1px solid #EDE5D2;">
        <span style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#7E6133;">${escapeHtml(c.label)}</span><br />
        <span style="color:#8E8168;text-decoration:line-through;">${c.before ? escapeHtml(c.before) : "—"}</span><br />
        <span style="color:#342D22;">${c.after ? escapeHtml(c.after) : "—"}</span>
      </li>`
    )
    .join("");

  const body = `
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#231E16;">${title} a changé</h1>
    <p style="margin:0 0 16px;color:#4A4132;line-height:1.6;">
      Le créateur a mis à jour ${args.changes.length > 1 ? "quelques détails" : "un détail"} de la sortie&nbsp;:
    </p>
    <ul style="margin:8px 0 24px;padding:0;">${rows}</ul>
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(args.outingUrl)}" style="color:#6B1F2A;text-decoration:underline;">Revoir la sortie</a>
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
