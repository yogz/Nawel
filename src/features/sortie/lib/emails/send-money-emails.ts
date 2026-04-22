import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { sendSortieEmail } from "@/lib/resend-sortie";
import { debts, participants, purchaserPaymentMethods } from "@drizzle/sortie-schema";
import {
  paymentConfirmedEmail,
  paymentDeclaredEmail,
  purchaseConfirmedEmail,
  type PaymentMethodPreview,
} from "./templates";

/**
 * Money-layer emails share a lot of setup — resolving a participant's
 * contact email, their display name, and the buyer's payment methods.
 * Centralised here so three server actions can drop-in and not think
 * about Drizzle joins.
 *
 * Every sender catches its own Resend errors and logs them; the parent
 * server action treats an email failure as non-fatal so the money state
 * transition never gets rolled back by a transient mail hiccup.
 */

const BASE_URL = (process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr").replace(/\/$/, "");

function outingPath(slug: string | null, shortId: string): string {
  return slug ? `/${slug}-${shortId}` : `/${shortId}`;
}

type ContactInfo = {
  participantId: string;
  email: string | null;
  name: string;
};

async function fetchContacts(participantIds: string[]): Promise<ContactInfo[]> {
  if (participantIds.length === 0) {
    return [];
  }
  const rows = await db.query.participants.findMany({
    where: inArray(participants.id, participantIds),
    with: { user: { columns: { name: true, email: true } } },
  });
  return rows.map((p) => ({
    participantId: p.id,
    email: p.anonEmail ?? p.user?.email ?? null,
    name: p.anonName ?? p.user?.name ?? "Quelqu'un",
  }));
}

async function fetchMethodsFor(participantId: string): Promise<PaymentMethodPreview[]> {
  const rows = await db
    .select({
      type: purchaserPaymentMethods.type,
      valuePreview: purchaserPaymentMethods.valuePreview,
      displayLabel: purchaserPaymentMethods.displayLabel,
    })
    .from(purchaserPaymentMethods)
    .where(eq(purchaserPaymentMethods.participantId, participantId));
  return rows;
}

async function safeSend(args: {
  to: string;
  subject: string;
  html: string;
  trigger: string;
}): Promise<void> {
  try {
    await sendSortieEmail({ to: args.to, subject: args.subject, html: args.html });
  } catch (err) {
    console.error(`[sortie/email] ${args.trigger} send failed`, err);
  }
}

/**
 * Called after declarePurchaseAction writes the purchase + debts. Sends one
 * email per non-buyer participant who has an email on file.
 */
export async function sendPurchaseConfirmedEmails(args: {
  outing: { title: string; fixedDatetime: Date | null; slug: string | null; shortId: string };
  buyerParticipantId: string;
  debts: Map<string, number>;
}): Promise<void> {
  const buyerContact = (await fetchContacts([args.buyerParticipantId]))[0];
  const buyerName = buyerContact?.name ?? "Quelqu'un";
  const methods = await fetchMethodsFor(args.buyerParticipantId);
  const debtorContacts = await fetchContacts(Array.from(args.debts.keys()));
  const canonical = outingPath(args.outing.slug, args.outing.shortId);

  await Promise.all(
    debtorContacts
      .filter((c) => c.email)
      .map((c) => {
        const amount = args.debts.get(c.participantId) ?? 0;
        if (amount <= 0) {
          return Promise.resolve();
        }
        const { subject, html } = purchaseConfirmedEmail({
          outingTitle: args.outing.title,
          outingDate: args.outing.fixedDatetime,
          buyerName,
          debtorName: c.name,
          amountCents: amount,
          outingUrl: `${BASE_URL}${canonical}`,
          debtsUrl: `${BASE_URL}${canonical}/dettes`,
          methods,
        });
        return safeSend({ to: c.email!, subject, html, trigger: "purchase-confirmed" });
      })
  );
}

/**
 * Called after a debtor marks a debt paid. Notifies the creditor (the one
 * who needs to confirm reception).
 */
export async function sendPaymentDeclaredEmail(args: {
  outing: { title: string; slug: string | null; shortId: string };
  debtId: string;
}): Promise<void> {
  const [debt] = await db.select().from(debts).where(eq(debts.id, args.debtId)).limit(1);
  if (!debt) {
    return;
  }
  const contacts = await fetchContacts([debt.debtorParticipantId, debt.creditorParticipantId]);
  const debtor = contacts.find((c) => c.participantId === debt.debtorParticipantId);
  const creditor = contacts.find((c) => c.participantId === debt.creditorParticipantId);
  if (!creditor?.email) {
    return;
  }
  const canonical = outingPath(args.outing.slug, args.outing.shortId);
  const { subject, html } = paymentDeclaredEmail({
    outingTitle: args.outing.title,
    debtorName: debtor?.name ?? "Quelqu'un",
    amountCents: debt.amountCents,
    debtsUrl: `${BASE_URL}${canonical}/dettes`,
  });
  await safeSend({ to: creditor.email, subject, html, trigger: "payment-declared" });
}

/**
 * Called after the creditor confirms reception. Closes the loop in the
 * debtor's inbox.
 */
export async function sendPaymentConfirmedEmail(args: {
  outing: { title: string; slug: string | null; shortId: string };
  debtId: string;
}): Promise<void> {
  const [debt] = await db
    .select()
    .from(debts)
    .where(and(eq(debts.id, args.debtId)))
    .limit(1);
  if (!debt) {
    return;
  }
  const contacts = await fetchContacts([debt.debtorParticipantId, debt.creditorParticipantId]);
  const debtor = contacts.find((c) => c.participantId === debt.debtorParticipantId);
  const creditor = contacts.find((c) => c.participantId === debt.creditorParticipantId);
  if (!debtor?.email) {
    return;
  }
  const canonical = outingPath(args.outing.slug, args.outing.shortId);
  const { subject, html } = paymentConfirmedEmail({
    outingTitle: args.outing.title,
    creditorName: creditor?.name ?? "Quelqu'un",
    amountCents: debt.amountCents,
    outingUrl: `${BASE_URL}${canonical}`,
  });
  await safeSend({ to: debtor.email, subject, html, trigger: "payment-confirmed" });
}
