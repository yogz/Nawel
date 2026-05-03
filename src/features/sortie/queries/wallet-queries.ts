import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  debts,
  outings,
  participants,
  purchaseAllocations,
  purchases,
  purchaserPaymentMethods,
} from "@drizzle/sortie-schema";

// Le wallet ne montre rien sur les sorties annulées : la dette n'a plus
// à être réglée et l'allocation n'a plus de sens budgétaire. On les
// exclut côté SQL plutôt que de filtrer en mémoire — laisser passer
// gonflerait inutilement les payloads quand un user a 30 sorties dont
// 10 annulées.
const EXCLUDED_OUTING_STATUSES = ["cancelled"] as const;

export type OutingStatus =
  | "open"
  | "awaiting_purchase"
  | "stale_purchase"
  | "purchased"
  | "past"
  | "settled"
  | "cancelled";

export type OutingRef = {
  id: string;
  title: string;
  slug: string | null;
  shortId: string;
  status: OutingStatus;
};

type PersonRef = {
  id: string;
  anonName: string | null;
  userName: string | null;
};

export type PaymentMethodRef = {
  id: string;
  type: "iban" | "lydia" | "revolut" | "wero";
  valuePreview: string;
  displayLabel: string | null;
};

export type WalletDebtRow = {
  id: string;
  amountCents: number;
  status: "pending" | "declared_paid" | "confirmed";
  outing: OutingRef;
  debtor: PersonRef;
  creditor: PersonRef;
  creditorMethods: PaymentMethodRef[];
};

export type WalletAllocationRow = {
  id: string;
  isChild: boolean;
  pricingMode: "unique" | "category" | "nominal";
  uniquePriceCents: number | null;
  adultPriceCents: number | null;
  childPriceCents: number | null;
  nominalPriceCents: number | null;
  outing: OutingRef;
};

/**
 * Récupère tous les `participants.id` d'un user authentifié.
 * Un user peut avoir N rows (une par sortie joinée). Les rows anon
 * (cookieTokenHash sans userId) ne sont volontairement pas
 * réconciliées ici — la page wallet documente cette limite.
 */
async function getParticipantIdsForUser(userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.userId, userId));
  return rows.map((r) => r.id);
}

function personFromRow(p: {
  id: string;
  anonName: string | null;
  user: { name: string | null } | null;
}): PersonRef {
  return { id: p.id, anonName: p.anonName, userName: p.user?.name ?? null };
}

async function attachPeopleAndMethods(
  rows: {
    id: string;
    amountCents: number;
    status: WalletDebtRow["status"];
    outing: OutingRef;
    debtorParticipantId: string;
    creditorParticipantId: string;
  }[]
): Promise<WalletDebtRow[]> {
  if (rows.length === 0) {
    return [];
  }
  const peopleIds = new Set<string>();
  const creditorIds = new Set<string>();
  for (const r of rows) {
    peopleIds.add(r.debtorParticipantId);
    peopleIds.add(r.creditorParticipantId);
    creditorIds.add(r.creditorParticipantId);
  }
  const [people, methods] = await Promise.all([
    db.query.participants.findMany({
      where: inArray(participants.id, Array.from(peopleIds)),
      columns: { id: true, anonName: true },
      with: { user: { columns: { name: true } } },
    }),
    creditorIds.size > 0
      ? db
          .select({
            id: purchaserPaymentMethods.id,
            participantId: purchaserPaymentMethods.participantId,
            type: purchaserPaymentMethods.type,
            valuePreview: purchaserPaymentMethods.valuePreview,
            displayLabel: purchaserPaymentMethods.displayLabel,
          })
          .from(purchaserPaymentMethods)
          .where(inArray(purchaserPaymentMethods.participantId, Array.from(creditorIds)))
      : Promise.resolve([] as never[]),
  ]);

  const byId = new Map(people.map((p) => [p.id, personFromRow(p)]));
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
    outing: r.outing,
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

/**
 * Toutes les dettes où le user est `debtor` (« ce qu'il doit »), tout
 * outings confondus sauf cancelled. Hit l'index `sortie_debts_debtor_idx`
 * via `inArray(debts.debtorParticipantId, …)`.
 */
export async function getWalletDebts(userId: string): Promise<WalletDebtRow[]> {
  const participantIds = await getParticipantIdsForUser(userId);
  if (participantIds.length === 0) {
    return [];
  }
  const rows = await db
    .select({
      id: debts.id,
      amountCents: debts.amountCents,
      status: debts.status,
      debtorParticipantId: debts.debtorParticipantId,
      creditorParticipantId: debts.creditorParticipantId,
      outingId: outings.id,
      outingTitle: outings.title,
      outingSlug: outings.slug,
      outingShortId: outings.shortId,
      outingStatus: outings.status,
    })
    .from(debts)
    .innerJoin(outings, eq(outings.id, debts.outingId))
    .where(
      and(
        inArray(debts.debtorParticipantId, participantIds),
        ne(outings.status, EXCLUDED_OUTING_STATUSES[0])
      )
    );

  return attachPeopleAndMethods(
    rows.map((r) => ({
      id: r.id,
      amountCents: r.amountCents,
      status: r.status,
      debtorParticipantId: r.debtorParticipantId,
      creditorParticipantId: r.creditorParticipantId,
      outing: {
        id: r.outingId,
        title: r.outingTitle,
        slug: r.outingSlug,
        shortId: r.outingShortId,
        status: r.outingStatus,
      },
    }))
  );
}

/**
 * Symétrique de `getWalletDebts` côté créditeur. Hit
 * `sortie_debts_creditor_idx`.
 */
export async function getWalletCredits(userId: string): Promise<WalletDebtRow[]> {
  const participantIds = await getParticipantIdsForUser(userId);
  if (participantIds.length === 0) {
    return [];
  }
  const rows = await db
    .select({
      id: debts.id,
      amountCents: debts.amountCents,
      status: debts.status,
      debtorParticipantId: debts.debtorParticipantId,
      creditorParticipantId: debts.creditorParticipantId,
      outingId: outings.id,
      outingTitle: outings.title,
      outingSlug: outings.slug,
      outingShortId: outings.shortId,
      outingStatus: outings.status,
    })
    .from(debts)
    .innerJoin(outings, eq(outings.id, debts.outingId))
    .where(
      and(
        inArray(debts.creditorParticipantId, participantIds),
        ne(outings.status, EXCLUDED_OUTING_STATUSES[0])
      )
    );

  return attachPeopleAndMethods(
    rows.map((r) => ({
      id: r.id,
      amountCents: r.amountCents,
      status: r.status,
      debtorParticipantId: r.debtorParticipantId,
      creditorParticipantId: r.creditorParticipantId,
      outing: {
        id: r.outingId,
        title: r.outingTitle,
        slug: r.outingSlug,
        shortId: r.outingShortId,
        status: r.outingStatus,
      },
    }))
  );
}

/**
 * Toutes les places allouées au user. Sert à calculer « mes dépenses »
 * (sum des prix résolus, hors null). Hit
 * `sortie_allocations_participant_idx`.
 */
export async function getWalletAllocations(userId: string): Promise<WalletAllocationRow[]> {
  const participantIds = await getParticipantIdsForUser(userId);
  if (participantIds.length === 0) {
    return [];
  }
  const rows = await db
    .select({
      id: purchaseAllocations.id,
      isChild: purchaseAllocations.isChild,
      nominalPriceCents: purchaseAllocations.nominalPriceCents,
      pricingMode: purchases.pricingMode,
      uniquePriceCents: purchases.uniquePriceCents,
      adultPriceCents: purchases.adultPriceCents,
      childPriceCents: purchases.childPriceCents,
      outingId: outings.id,
      outingTitle: outings.title,
      outingSlug: outings.slug,
      outingShortId: outings.shortId,
      outingStatus: outings.status,
    })
    .from(purchaseAllocations)
    .innerJoin(purchases, eq(purchases.id, purchaseAllocations.purchaseId))
    .innerJoin(outings, eq(outings.id, purchases.outingId))
    .where(
      and(
        inArray(purchaseAllocations.participantId, participantIds),
        ne(outings.status, EXCLUDED_OUTING_STATUSES[0])
      )
    );

  return rows.map((r) => ({
    id: r.id,
    isChild: r.isChild,
    pricingMode: r.pricingMode,
    uniquePriceCents: r.uniquePriceCents,
    adultPriceCents: r.adultPriceCents,
    childPriceCents: r.childPriceCents,
    nominalPriceCents: r.nominalPriceCents,
    outing: {
      id: r.outingId,
      title: r.outingTitle,
      slug: r.outingSlug,
      shortId: r.outingShortId,
      status: r.outingStatus,
    },
  }));
}
