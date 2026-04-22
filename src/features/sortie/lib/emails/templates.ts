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
