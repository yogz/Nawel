import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { debts, participants, purchaserPaymentMethods } from "@drizzle/sortie-schema";

type PersonRef = {
  id: string;
  anonName: string | null;
  userName: string | null;
};

type PaymentMethodRef = {
  id: string;
  type: "iban" | "lydia" | "revolut" | "wero";
  valuePreview: string;
  displayLabel: string | null;
};

export type DebtRow = {
  id: string;
  amountCents: number;
  status: "pending" | "declared_paid" | "confirmed";
  declaredAt: Date | null;
  confirmedAt: Date | null;
  debtor: PersonRef;
  creditor: PersonRef;
  creditorMethods: PaymentMethodRef[];
};

async function attachNames(rows: (typeof debts.$inferSelect)[]): Promise<DebtRow[]> {
  if (rows.length === 0) {
    return [];
  }
  const ids = new Set<string>();
  for (const r of rows) {
    ids.add(r.debtorParticipantId);
    ids.add(r.creditorParticipantId);
  }
  const people = await db.query.participants.findMany({
    where: (p, { inArray }) => inArray(p.id, Array.from(ids)),
    with: { user: { columns: { name: true } } },
  });
  const byId = new Map(
    people.map((p) => [p.id, { id: p.id, anonName: p.anonName, userName: p.user?.name ?? null }])
  );

  const creditorIds = Array.from(new Set(rows.map((r) => r.creditorParticipantId)));
  const methods = await db
    .select({
      id: purchaserPaymentMethods.id,
      participantId: purchaserPaymentMethods.participantId,
      type: purchaserPaymentMethods.type,
      valuePreview: purchaserPaymentMethods.valuePreview,
      displayLabel: purchaserPaymentMethods.displayLabel,
    })
    .from(purchaserPaymentMethods)
    .where(
      creditorIds.length > 0
        ? or(...creditorIds.map((id) => eq(purchaserPaymentMethods.participantId, id)))!
        : eq(purchaserPaymentMethods.participantId, "")
    );
  const methodsByCreditor = new Map<string, PaymentMethodRef[]>();
  for (const m of methods) {
    const list = methodsByCreditor.get(m.participantId) ?? [];
    list.push({
      id: m.id,
      type: m.type,
      valuePreview: m.valuePreview,
      displayLabel: m.displayLabel,
    });
    methodsByCreditor.set(m.participantId, list);
  }

  return rows.map((r) => ({
    id: r.id,
    amountCents: r.amountCents,
    status: r.status,
    declaredAt: r.declaredAt,
    confirmedAt: r.confirmedAt,
    debtor: byId.get(r.debtorParticipantId) ?? {
      id: r.debtorParticipantId,
      anonName: null,
      userName: null,
    },
    creditor: byId.get(r.creditorParticipantId) ?? {
      id: r.creditorParticipantId,
      anonName: null,
      userName: null,
    },
    creditorMethods: methodsByCreditor.get(r.creditorParticipantId) ?? [],
  }));
}

export async function getMyDebts(outingId: string, participantId: string) {
  const rows = await db
    .select()
    .from(debts)
    .where(and(eq(debts.outingId, outingId), eq(debts.debtorParticipantId, participantId)));
  return attachNames(rows);
}

export async function getMyCredits(outingId: string, participantId: string) {
  const rows = await db
    .select()
    .from(debts)
    .where(and(eq(debts.outingId, outingId), eq(debts.creditorParticipantId, participantId)));
  return attachNames(rows);
}
