import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditLog,
  debts,
  outings,
  participants,
  purchaseAllocations,
  purchases,
  type debtStatus,
  type outingStatus,
  type pricingMode,
} from "@drizzle/sortie-schema";
import { user } from "@drizzle/schema";

export type DebtStatus = (typeof debtStatus.enumValues)[number];
export type OutingStatus = (typeof outingStatus.enumValues)[number];
export type PricingMode = (typeof pricingMode.enumValues)[number];

export type AdminDebtOutingRow = {
  outingId: string;
  shortId: string;
  slug: string;
  title: string;
  status: OutingStatus;
  fixedDatetime: Date | null;
  buyer: { participantId: string; name: string };
  totalPlaces: number;
  totalCents: number;
  pendingCents: number;
  declaredPaidCents: number;
  confirmedCents: number;
  debtsCount: number;
};

function displayName(p: { anonName: string | null; userName: string | null }): string {
  return p.userName ?? p.anonName ?? "—";
}

/**
 * Liste des sorties qui ont un achat enregistré, avec agrégats par status.
 * Cible : la console admin /admin/dettes (pas de pagination en V1, le
 * volume reste très faible — quelques dizaines max).
 */
export async function listAdminDebtOutings(): Promise<AdminDebtOutingRow[]> {
  const baseRows = await db
    .select({
      outingId: outings.id,
      shortId: outings.shortId,
      slug: outings.slug,
      title: outings.title,
      status: outings.status,
      fixedDatetime: outings.fixedDatetime,
      createdAt: outings.createdAt,
      buyerParticipantId: purchases.purchaserParticipantId,
      totalPlaces: purchases.totalPlaces,
      buyerAnonName: participants.anonName,
      buyerUserName: user.name,
    })
    .from(purchases)
    .innerJoin(outings, eq(purchases.outingId, outings.id))
    .innerJoin(participants, eq(purchases.purchaserParticipantId, participants.id))
    .leftJoin(user, eq(participants.userId, user.id))
    .orderBy(desc(outings.createdAt));

  if (baseRows.length === 0) {
    return [];
  }

  // Aggregat dettes par outing × status. Un seul round-trip plutôt qu'un
  // SELECT par outing — les sorties sans dette n'apparaissent pas dans le
  // résultat, on guard avec coalesce(0) côté Map.
  const outingIds = baseRows.map((r) => r.outingId);
  const aggRows = await db
    .select({
      outingId: debts.outingId,
      status: debts.status,
      sum: sql<number>`COALESCE(SUM(${debts.amountCents}), 0)::int`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(debts)
    .where(inArray(debts.outingId, outingIds))
    .groupBy(debts.outingId, debts.status);

  type Agg = { pending: number; declared: number; confirmed: number; count: number };
  const aggByOuting = new Map<string, Agg>();
  for (const r of aggRows) {
    const slot = aggByOuting.get(r.outingId) ?? {
      pending: 0,
      declared: 0,
      confirmed: 0,
      count: 0,
    };
    if (r.status === "pending") {
      slot.pending += r.sum;
    } else if (r.status === "declared_paid") {
      slot.declared += r.sum;
    } else if (r.status === "confirmed") {
      slot.confirmed += r.sum;
    }
    slot.count += r.count;
    aggByOuting.set(r.outingId, slot);
  }

  return baseRows.map((r) => {
    const agg = aggByOuting.get(r.outingId) ?? {
      pending: 0,
      declared: 0,
      confirmed: 0,
      count: 0,
    };
    return {
      outingId: r.outingId,
      shortId: r.shortId,
      slug: r.slug,
      title: r.title,
      status: r.status,
      fixedDatetime: r.fixedDatetime,
      buyer: {
        participantId: r.buyerParticipantId,
        name: displayName({ anonName: r.buyerAnonName, userName: r.buyerUserName }),
      },
      totalPlaces: r.totalPlaces,
      totalCents: agg.pending + agg.declared + agg.confirmed,
      pendingCents: agg.pending,
      declaredPaidCents: agg.declared,
      confirmedCents: agg.confirmed,
      debtsCount: agg.count,
    };
  });
}

export type AdminParticipantRef = {
  id: string;
  name: string;
  email: string | null;
  isAnon: boolean;
  isBuyer: boolean;
  hasAllocation: boolean;
};

export type AdminAllocationRow = {
  id: string;
  participantId: string;
  participantName: string;
  isChild: boolean;
  nominalPriceCents: number | null;
};

export type AdminDebtDetailRow = {
  id: string;
  amountCents: number;
  status: DebtStatus;
  declaredAt: Date | null;
  confirmedAt: Date | null;
  debtor: { participantId: string; name: string };
  creditor: { participantId: string; name: string };
  createdAt: Date;
  updatedAt: Date;
};

export type AdminAuditEntry = {
  id: string;
  action: string;
  createdAt: Date;
  actorName: string | null;
  payload: string | null;
};

export type AdminDebtView = {
  outing: {
    id: string;
    shortId: string;
    slug: string;
    title: string;
    status: OutingStatus;
    fixedDatetime: Date | null;
  };
  purchase: {
    id: string;
    pricingMode: PricingMode;
    uniquePriceCents: number | null;
    adultPriceCents: number | null;
    childPriceCents: number | null;
    totalPlaces: number;
    proofFileUrl: string | null;
    purchaserParticipantId: string;
  };
  participants: AdminParticipantRef[];
  allocations: AdminAllocationRow[];
  debts: AdminDebtDetailRow[];
  audit: AdminAuditEntry[];
};

/**
 * Vue détail admin pour une sortie : payeur, allocations, dettes, audit.
 * Renvoie null si la sortie n'existe pas ou n'a pas d'achat enregistré.
 */
export async function getAdminDebtView(shortId: string): Promise<AdminDebtView | null> {
  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
    columns: {
      id: true,
      shortId: true,
      slug: true,
      title: true,
      status: true,
      fixedDatetime: true,
    },
  });
  if (!outing) {
    return null;
  }

  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.outingId, outing.id),
  });
  if (!purchase) {
    return null;
  }

  const partRows = await db
    .select({
      id: participants.id,
      anonName: participants.anonName,
      anonEmail: participants.anonEmail,
      userId: participants.userId,
      userName: user.name,
      userEmail: user.email,
    })
    .from(participants)
    .leftJoin(user, eq(participants.userId, user.id))
    .where(eq(participants.outingId, outing.id));

  const allocRows = await db.query.purchaseAllocations.findMany({
    where: eq(purchaseAllocations.purchaseId, purchase.id),
  });

  const debtRows = await db.query.debts.findMany({
    where: eq(debts.outingId, outing.id),
  });

  const auditRows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      createdAt: auditLog.createdAt,
      actorUserId: auditLog.actorUserId,
      actorParticipantId: auditLog.actorParticipantId,
      payload: auditLog.payload,
      actorUserName: user.name,
    })
    .from(auditLog)
    .leftJoin(user, eq(auditLog.actorUserId, user.id))
    .where(and(eq(auditLog.outingId, outing.id), sql`${auditLog.action} ~ 'DEBT|PURCHASE'`))
    .orderBy(desc(auditLog.createdAt))
    .limit(20);

  const allocsByParticipant = new Set(allocRows.map((a) => a.participantId));

  const participantsView: AdminParticipantRef[] = partRows.map((p) => ({
    id: p.id,
    name: displayName({ anonName: p.anonName, userName: p.userName }),
    email: p.userEmail ?? p.anonEmail ?? null,
    isAnon: !p.userId,
    isBuyer: p.id === purchase.purchaserParticipantId,
    hasAllocation: allocsByParticipant.has(p.id),
  }));

  const nameOf = (id: string) => participantsView.find((p) => p.id === id)?.name ?? "—";

  const allocations: AdminAllocationRow[] = allocRows.map((a) => ({
    id: a.id,
    participantId: a.participantId,
    participantName: nameOf(a.participantId),
    isChild: a.isChild,
    nominalPriceCents: a.nominalPriceCents ?? null,
  }));

  const debtsView: AdminDebtDetailRow[] = debtRows.map((d) => ({
    id: d.id,
    amountCents: d.amountCents,
    status: d.status,
    declaredAt: d.declaredAt,
    confirmedAt: d.confirmedAt,
    debtor: { participantId: d.debtorParticipantId, name: nameOf(d.debtorParticipantId) },
    creditor: { participantId: d.creditorParticipantId, name: nameOf(d.creditorParticipantId) },
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));

  const audit: AdminAuditEntry[] = auditRows.map((a) => ({
    id: a.id,
    action: a.action,
    createdAt: a.createdAt,
    actorName: a.actorUserName ?? null,
    payload: a.payload,
  }));

  return {
    outing,
    purchase: {
      id: purchase.id,
      pricingMode: purchase.pricingMode,
      uniquePriceCents: purchase.uniquePriceCents,
      adultPriceCents: purchase.adultPriceCents,
      childPriceCents: purchase.childPriceCents,
      totalPlaces: purchase.totalPlaces,
      proofFileUrl: purchase.proofFileUrl,
      purchaserParticipantId: purchase.purchaserParticipantId,
    },
    participants: participantsView,
    allocations,
    debts: debtsView,
    audit,
  };
}
