import { and, eq, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  debts,
  participants,
  purchaseAllocations,
  purchases,
  purchaserPaymentMethods,
} from "@drizzle/sortie-schema";

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

export type MyAllocationRow = {
  id: string;
  purchaseId: string;
  isChild: boolean;
  nominalPriceCents: number | null;
  buyerParticipantId: string;
  pricingMode: "unique" | "category" | "nominal";
  uniquePriceCents: number | null;
  adultPriceCents: number | null;
  childPriceCents: number | null;
};

/**
 * Pulls every allocation currently assigned to `participantId` on this
 * outing, plus enough of the parent purchase to re-price a seat when the
 * holder cedes it. Used by the cession UI so the user sees "what I hold"
 * next to "what I owe".
 */
export async function getMyAllocations(
  outingId: string,
  participantId: string
): Promise<MyAllocationRow[]> {
  const rows = await db
    .select({
      id: purchaseAllocations.id,
      purchaseId: purchaseAllocations.purchaseId,
      isChild: purchaseAllocations.isChild,
      nominalPriceCents: purchaseAllocations.nominalPriceCents,
      buyerParticipantId: purchases.purchaserParticipantId,
      pricingMode: purchases.pricingMode,
      uniquePriceCents: purchases.uniquePriceCents,
      adultPriceCents: purchases.adultPriceCents,
      childPriceCents: purchases.childPriceCents,
    })
    .from(purchaseAllocations)
    .innerJoin(purchases, eq(purchases.id, purchaseAllocations.purchaseId))
    .where(
      and(eq(purchases.outingId, outingId), eq(purchaseAllocations.participantId, participantId))
    );
  return rows;
}

/**
 * Lists other confirmed participants (response="yes") on this outing so
 * the cession UI can offer a target. Excludes the holder themselves —
 * ceding to yourself is a no-op.
 */
export async function listCessionTargets(
  outingId: string,
  excludeParticipantId: string
): Promise<{ id: string; name: string }[]> {
  const rows = await db.query.participants.findMany({
    where: and(
      eq(participants.outingId, outingId),
      eq(participants.response, "yes"),
      ne(participants.id, excludeParticipantId)
    ),
    with: { user: { columns: { name: true } } },
    columns: { id: true, anonName: true },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.anonName ?? p.user?.name ?? "Quelqu'un",
  }));
}
