import { and, eq, inArray, ne, or } from "drizzle-orm";
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

export type DebtSummary = {
  /** Dettes où je suis débiteur, status=pending → à payer. */
  unpaidCount: number;
  unpaidAmountCents: number;
  /** Plus ancienne dette pending — sert à passer en tone "hot" au-delà de 7j. */
  oldestUnpaidAt: Date | null;
  /** Dettes où je suis créancier, status=declared_paid → à confirmer. */
  declaredCount: number;
};

/**
 * Aggrège les dettes du user logged-in sur un lot d'outings, dans les
 * deux rôles (débiteur pending = "à payer" ; créancier declared_paid =
 * "à confirmer"). Retourne une map keyée par outingId — les outings sans
 * dette du user n'apparaissent pas.
 *
 * Utilisé par `computePendingActions` pour les kinds `pay-debt` et
 * `confirm-debt-received`. On résout d'abord les `participantId` du user
 * sur ces outings (nécessaire car `debts` réfère des participants, pas
 * des users), puis un seul SELECT sur `debts` filtré sur l'union des
 * participantIds en débiteur OU créancier.
 */
export async function listMyDebtSummariesForOutings(args: {
  outingIds: string[];
  userId: string;
}): Promise<Map<string, DebtSummary>> {
  if (args.outingIds.length === 0) {
    return new Map();
  }

  const myParticipants = await db
    .select({ id: participants.id, outingId: participants.outingId })
    .from(participants)
    .where(
      and(eq(participants.userId, args.userId), inArray(participants.outingId, args.outingIds))
    );

  if (myParticipants.length === 0) {
    return new Map();
  }

  const myParticipantIds = myParticipants.map((p) => p.id);
  const mineSet = new Set(myParticipantIds);

  const rows = await db
    .select()
    .from(debts)
    .where(
      and(
        inArray(debts.outingId, args.outingIds),
        or(
          inArray(debts.debtorParticipantId, myParticipantIds),
          inArray(debts.creditorParticipantId, myParticipantIds)
        )
      )
    );

  const summaries = new Map<string, DebtSummary>();
  const ensure = (outingId: string): DebtSummary => {
    let s = summaries.get(outingId);
    if (!s) {
      s = { unpaidCount: 0, unpaidAmountCents: 0, oldestUnpaidAt: null, declaredCount: 0 };
      summaries.set(outingId, s);
    }
    return s;
  };

  for (const d of rows) {
    if (d.status === "pending" && mineSet.has(d.debtorParticipantId)) {
      const s = ensure(d.outingId);
      s.unpaidCount += 1;
      s.unpaidAmountCents += d.amountCents;
      if (!s.oldestUnpaidAt || d.createdAt < s.oldestUnpaidAt) {
        s.oldestUnpaidAt = d.createdAt;
      }
    }
    if (d.status === "declared_paid" && mineSet.has(d.creditorParticipantId)) {
      const s = ensure(d.outingId);
      s.declaredCount += 1;
    }
  }

  return summaries;
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
