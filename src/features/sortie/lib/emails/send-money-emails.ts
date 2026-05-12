import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { debts, participants, purchaserPaymentMethods } from "@drizzle/sortie-schema";
import {
  bulkPaymentDeclaredEmail,
  bulkSettledEmail,
  debtBulkReminderEmail,
  debtReminderEmail,
  paymentConfirmedEmail,
  paymentDeclaredEmail,
  purchaseConfirmedEmail,
  type PaymentMethodPreview,
} from "./templates";
import { BASE_URL, outingPath, safeSend } from "./shared";

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
 * Called when the creditor taps "Relancer par email" on a still-open debt.
 * Notifies the debtor avec un rappel léger + CTA vers la page dettes.
 * Le rate-limit (1×/48h par dette) est appliqué côté Server Action — ici on
 * envoie sans question. Skip si le débiteur n'a pas d'email on file.
 */
export async function sendDebtReminderEmail(args: {
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
  if (!debtor?.email) {
    return;
  }
  const canonical = outingPath(args.outing.slug, args.outing.shortId);
  const { subject, html } = debtReminderEmail({
    outingTitle: args.outing.title,
    creditorName: creditor?.name ?? "Quelqu'un",
    amountCents: debt.amountCents,
    debtsUrl: `${BASE_URL}${canonical}/dettes`,
  });
  await safeSend({ to: debtor.email, subject, html, trigger: "debt-reminder" });
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

type UserContact = { email: string | null; name: string };

async function fetchUserContact(userId: string): Promise<UserContact | null> {
  const [row] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!row) {
    return null;
  }
  return { email: row.email ?? null, name: row.name ?? "Quelqu'un" };
}

type BulkEmailItem = { outingTitle: string; amountCents: number };

/**
 * Bulk reminder : un seul email récap envoyé au débiteur (identifié par
 * son `userId`) listant toutes les dettes ouvertes que le créancier a
 * envers lui. Rate-limit appliqué côté action.
 */
export async function sendDebtBulkReminderEmail(args: {
  debtorUserId: string;
  creditorUserId: string;
  items: BulkEmailItem[];
  totalCents: number;
}): Promise<void> {
  const [debtor, creditor] = await Promise.all([
    fetchUserContact(args.debtorUserId),
    fetchUserContact(args.creditorUserId),
  ]);
  if (!debtor?.email) {
    return;
  }
  const { subject, html } = debtBulkReminderEmail({
    creditorName: creditor?.name ?? "Quelqu'un",
    totalCents: args.totalCents,
    items: args.items,
    walletUrl: `${BASE_URL}/moi/argent`,
  });
  await safeSend({ to: debtor.email, subject, html, trigger: "bulk-debt-reminder" });
}

/**
 * Bulk paid : un seul email envoyé au créancier listant toutes les dettes
 * que le débiteur a déclarées payées en un coup.
 */
export async function sendBulkPaymentDeclaredEmail(args: {
  debtorUserId: string;
  creditorUserId: string;
  items: BulkEmailItem[];
  totalCents: number;
}): Promise<void> {
  const [debtor, creditor] = await Promise.all([
    fetchUserContact(args.debtorUserId),
    fetchUserContact(args.creditorUserId),
  ]);
  if (!creditor?.email) {
    return;
  }
  const { subject, html } = bulkPaymentDeclaredEmail({
    debtorName: debtor?.name ?? "Quelqu'un",
    totalCents: args.totalCents,
    items: args.items,
    walletUrl: `${BASE_URL}/moi/argent`,
  });
  await safeSend({ to: creditor.email, subject, html, trigger: "bulk-payment-declared" });
}

/**
 * Bulk settlement : un email envoyé à l'autre partie après une
 * compensation bilatérale (`settleNetAction`). Le contenu varie selon le
 * net du POV du destinataire.
 */
export async function sendBulkSettledEmail(args: {
  initiatorUserId: string;
  recipientUserId: string;
  /** Net signé du POV du destinataire (positif = il a "reçu" via compensation). */
  netCentsForRecipient: number;
  itemsRecipientOwed: BulkEmailItem[];
  itemsRecipientCredited: BulkEmailItem[];
}): Promise<void> {
  const [initiator, recipient] = await Promise.all([
    fetchUserContact(args.initiatorUserId),
    fetchUserContact(args.recipientUserId),
  ]);
  if (!recipient?.email) {
    return;
  }
  const { subject, html } = bulkSettledEmail({
    initiatorName: initiator?.name ?? "Quelqu'un",
    netCentsForRecipient: args.netCentsForRecipient,
    itemsRecipientOwed: args.itemsRecipientOwed,
    itemsRecipientCredited: args.itemsRecipientCredited,
    walletUrl: `${BASE_URL}/moi/argent`,
  });
  await safeSend({ to: recipient.email, subject, html, trigger: "bulk-settled" });
}
