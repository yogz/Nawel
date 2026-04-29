"use server";

import { and, asc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  debts,
  outings,
  participants,
  purchaseAllocations,
  purchases,
} from "@drizzle/sortie-schema";
import { buildAllocationPlan } from "@/features/sortie/lib/allocation-plan";
import { sendPurchaseConfirmedEmails } from "@/features/sortie/lib/emails/send-money-emails";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { uploadPurchaseProof } from "@/features/sortie/lib/proof-upload";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { getCurrentParticipant } from "@/features/sortie/lib/current-participant";
import type { FormActionState } from "./outing-actions";
import { shortIdSchema } from "./schemas";

const MAX_CENTS = 10_000_00;
// Tous les prix acceptent 0 — usage : prévente / abo / cadeau, l'orga
// déclare l'achat pour fermer la sortie sans réclamer de remboursement.
// Les debts sont filtrés en aval sur amount > 0, donc 0 ne crée aucune
// row.
const priceCents = z.coerce.number().int().min(0).max(MAX_CENTS);

// Three pricing modes covered end to end:
//  - unique:   one price for every seat
//  - category: one price for adults, another for children (uses is_child)
//  - nominal:  the buyer types a per-seat price (used for rare cases like
//              one senior + one student + one normal)
//
// `ghostBuyer` is the "je n'assiste pas, je prends juste les billets" path:
// the buyer pays upfront but gets no allocation — their extras are dropped
// too (they were tied to the buyer attending).
const ghostBuyerFlag = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.literal("false")])
  .optional()
  .transform((v) => v === "on" || v === "true");

const declarePurchaseSchema = z.discriminatedUnion("pricingMode", [
  z.object({
    shortId: shortIdSchema,
    pricingMode: z.literal("unique"),
    uniquePriceCents: priceCents,
    ghostBuyer: ghostBuyerFlag,
  }),
  z.object({
    shortId: shortIdSchema,
    pricingMode: z.literal("category"),
    adultPriceCents: priceCents,
    childPriceCents: priceCents,
    ghostBuyer: ghostBuyerFlag,
  }),
  z.object({
    shortId: shortIdSchema,
    pricingMode: z.literal("nominal"),
    allocationPriceCents: z.array(priceCents).min(1).max(100),
    ghostBuyer: ghostBuyerFlag,
  }),
]);

function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k === "allocationPriceCents") {
      continue;
    }
    // Skip File entries; they're handled separately via formData.get(name).
    if (typeof v !== "string") {
      continue;
    }
    obj[k] = v;
  }
  // `allocationPriceCents` may appear N times (one per seat input). FormData
  // entries() collapses duplicates; getAll() preserves the full ordered list.
  const multi = formData.getAll("allocationPriceCents").map(String);
  if (multi.length > 0) {
    obj.allocationPriceCents = multi;
  }
  return obj;
}

export async function declarePurchaseAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = declarePurchaseSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, data.shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }
  if (outing.status === "cancelled") {
    return { message: "Cette sortie est annulée." };
  }

  const { participant: me } = await getCurrentParticipant(outing.id);
  if (!me || me.response !== "yes") {
    return { message: "Seul un confirmé peut déclarer l'achat." };
  }

  const gate = await rateLimit({
    key: `purchase:${me.id}`,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  const yesRows = await db
    .select({
      id: participants.id,
      respondedAt: participants.respondedAt,
      extraAdults: participants.extraAdults,
      extraChildren: participants.extraChildren,
    })
    .from(participants)
    .where(and(eq(participants.outingId, outing.id), eq(participants.response, "yes")))
    .orderBy(asc(participants.respondedAt), asc(participants.id));

  if (yesRows.length === 0) {
    return { message: "Aucun confirmé — rien à acheter." };
  }

  // Ghost-buyer flow: drop the buyer's row entirely (self + extras) from the
  // allocation plan. Downstream the buyer simply won't appear in the
  // allocations table, and the debt computation naturally skips them.
  const planRows = data.ghostBuyer ? yesRows.filter((r) => r.id !== me.id) : yesRows;
  if (planRows.length === 0) {
    return { message: "Personne à servir — tu es seul·e confirmé·e et tu n'assistes pas." };
  }

  const plan = buildAllocationPlan(planRows);
  const totalPlaces = plan.length;

  if (data.pricingMode === "nominal" && data.allocationPriceCents.length !== plan.length) {
    return {
      message:
        "Le nombre de tarifs renseignés ne correspond plus aux confirmés. Recharge la page et réessaie.",
    };
  }

  // Optional proof upload — if present, validate + push to Vercel Blob before
  // we write the purchase row, so a broken upload doesn't leave a purchase
  // without its proof.
  let proofFileUrl: string | null = null;
  const proofFile = formData.get("proofFile");
  if (proofFile instanceof File && proofFile.size > 0) {
    const upload = await uploadPurchaseProof(proofFile);
    if (!upload.ok) {
      return { message: upload.message };
    }
    proofFileUrl = upload.url;
  }

  // Per-seat price resolver: everything downstream (debt rows, allocation
  // rows) reads from here, so mode-specific logic stays in one place.
  const priceFor = (index: number, isChild: boolean): number => {
    switch (data.pricingMode) {
      case "unique":
        return data.uniquePriceCents;
      case "category":
        return isChild ? data.childPriceCents : data.adultPriceCents;
      case "nominal":
        return data.allocationPriceCents[index]!;
    }
  };

  const allocationRows: (typeof purchaseAllocations.$inferInsert)[] = plan.map((entry, i) => ({
    purchaseId: "__placeholder__",
    participantId: entry.participantId,
    isChild: entry.isChild,
    nominalPriceCents: data.pricingMode === "nominal" ? data.allocationPriceCents[i] : null,
  }));

  // Aggregate each non-buyer's total into a single debt row.
  const debtsByParticipant = new Map<string, number>();
  plan.forEach((entry, i) => {
    if (entry.participantId === me.id) {
      return;
    }
    const amount = priceFor(i, entry.isChild);
    debtsByParticipant.set(
      entry.participantId,
      (debtsByParticipant.get(entry.participantId) ?? 0) + amount
    );
  });

  await db.transaction(async (tx) => {
    const [purchase] = await tx
      .insert(purchases)
      .values({
        outingId: outing.id,
        purchaserParticipantId: me.id,
        totalPlaces,
        pricingMode: data.pricingMode,
        uniquePriceCents: data.pricingMode === "unique" ? data.uniquePriceCents : null,
        adultPriceCents: data.pricingMode === "category" ? data.adultPriceCents : null,
        childPriceCents: data.pricingMode === "category" ? data.childPriceCents : null,
        proofFileUrl,
      })
      .returning({ id: purchases.id });

    if (allocationRows.length > 0) {
      await tx
        .insert(purchaseAllocations)
        .values(allocationRows.map((a) => ({ ...a, purchaseId: purchase.id })));
    }

    if (debtsByParticipant.size > 0) {
      await tx.insert(debts).values(
        Array.from(debtsByParticipant.entries())
          .filter(([, amount]) => amount > 0)
          .map(([participantId, amount]) => ({
            outingId: outing.id,
            debtorParticipantId: participantId,
            creditorParticipantId: me.id,
            amountCents: amount,
          }))
      );
    }

    await tx
      .update(outings)
      .set({
        status: "purchased",
        updatedAt: new Date(),
        // Bump SEQUENCE : transition awaiting_purchase → purchased.
        // Signale aux abonnés iCal que l'event est désormais figé
        // (TRANSP passe à OPAQUE, suffixe " · à confirmer" tombe).
        sequence: sql`${outings.sequence} + 1`,
      })
      .where(eq(outings.id, outing.id));
  });

  // Fire-and-forget notifications — failures are caught inside the helper so
  // Resend being down never rolls back the purchase we just wrote.
  await sendPurchaseConfirmedEmails({
    outing: {
      title: outing.title,
      fixedDatetime: outing.fixedDatetime,
      slug: outing.slug,
      shortId: outing.shortId,
    },
    buyerParticipantId: me.id,
    debts: debtsByParticipant,
  });

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}`);
  revalidatePath(`/${canonical}/dettes`);
  redirect(`/${canonical}/dettes`);
}

const cessionSchema = z.object({
  shortId: shortIdSchema,
  allocationId: z.string().uuid(),
  targetParticipantId: z.string().uuid(),
});

function priceOfAllocation(args: {
  pricingMode: "unique" | "category" | "nominal";
  isChild: boolean;
  uniquePriceCents: number | null;
  adultPriceCents: number | null;
  childPriceCents: number | null;
  nominalPriceCents: number | null;
}): number {
  switch (args.pricingMode) {
    case "unique":
      return args.uniquePriceCents ?? 0;
    case "category":
      return (args.isChild ? args.childPriceCents : args.adultPriceCents) ?? 0;
    case "nominal":
      return args.nominalPriceCents ?? 0;
  }
}

/**
 * Transfers a single allocation from the current holder to another confirmed
 * participant. Recomputes the debt ledger for the whole purchase from the
 * post-swap allocations so the arithmetic stays consistent — delta patches
 * would be fragile (especially around zero crossings and changed holders).
 *
 * Guardrails:
 *   - Only the current holder can cede.
 *   - Target must be a confirmed (`response="yes"`) participant of the
 *     same outing, and not the buyer (the buyer already paid).
 *   - Blocked once any debt on this purchase has moved past `pending` —
 *     reshuffling money that's already been declared paid creates
 *     reconciliation headaches nobody asked for.
 */
export async function cedeAllocationAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = cessionSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { shortId, allocationId, targetParticipantId } = parsed.data;

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  const { participant: me } = await getCurrentParticipant(outing.id);
  if (!me) {
    return { message: "Tu dois être inscrit·e pour céder ta place." };
  }

  const allocation = await db.query.purchaseAllocations.findFirst({
    where: eq(purchaseAllocations.id, allocationId),
    with: { purchase: true },
  });
  if (!allocation || allocation.purchase.outingId !== outing.id) {
    return { message: "Place introuvable." };
  }
  if (allocation.participantId !== me.id) {
    return { message: "Cette place n'est pas la tienne." };
  }
  if (allocation.purchase.purchaserParticipantId === targetParticipantId) {
    return { message: "L'acheteur a déjà payé sa part." };
  }

  const target = await db.query.participants.findFirst({
    where: and(
      eq(participants.id, targetParticipantId),
      eq(participants.outingId, outing.id),
      eq(participants.response, "yes")
    ),
  });
  if (!target) {
    return { message: "Destinataire introuvable parmi les confirmés." };
  }

  // Hard stop: once someone has declared or confirmed payment, we refuse
  // to renumber the ledger.
  const nonPendingDebts = await db
    .select({ id: debts.id })
    .from(debts)
    .where(and(eq(debts.outingId, outing.id), ne(debts.status, "pending")))
    .limit(1);
  if (nonPendingDebts.length > 0) {
    return { message: "Des paiements ont déjà été déclarés — la cession est bloquée." };
  }

  const gate = await rateLimit({
    key: `cede:${me.id}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  await db.transaction(async (tx) => {
    // Flip the allocation.
    await tx
      .update(purchaseAllocations)
      .set({ participantId: targetParticipantId })
      .where(eq(purchaseAllocations.id, allocationId));

    // Re-derive debts for this purchase from scratch. Delete + insert is
    // cheaper to reason about than delta patches — and there are at most
    // N allocations where N is small (≤100).
    const currentAllocs = await tx
      .select({
        participantId: purchaseAllocations.participantId,
        isChild: purchaseAllocations.isChild,
        nominalPriceCents: purchaseAllocations.nominalPriceCents,
      })
      .from(purchaseAllocations)
      .where(eq(purchaseAllocations.purchaseId, allocation.purchaseId));

    const perParticipant = new Map<string, number>();
    for (const a of currentAllocs) {
      if (a.participantId === allocation.purchase.purchaserParticipantId) {
        continue;
      }
      const cents = priceOfAllocation({
        pricingMode: allocation.purchase.pricingMode,
        isChild: a.isChild,
        uniquePriceCents: allocation.purchase.uniquePriceCents,
        adultPriceCents: allocation.purchase.adultPriceCents,
        childPriceCents: allocation.purchase.childPriceCents,
        nominalPriceCents: a.nominalPriceCents,
      });
      perParticipant.set(a.participantId, (perParticipant.get(a.participantId) ?? 0) + cents);
    }

    // Wipe and re-insert debts tied to this outing. Scoped to outingId
    // because multiple purchases per outing would share the table —
    // currently we only have one, but this keeps the logic defensive.
    await tx.delete(debts).where(eq(debts.outingId, outing.id));

    const rows = Array.from(perParticipant.entries())
      .filter(([, amount]) => amount > 0)
      .map(([participantId, amount]) => ({
        outingId: outing.id,
        debtorParticipantId: participantId,
        creditorParticipantId: allocation.purchase.purchaserParticipantId,
        amountCents: amount,
      }));
    if (rows.length > 0) {
      await tx.insert(debts).values(rows);
    }
  });

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}`);
  revalidatePath(`/${canonical}/dettes`);
  return {};
}
