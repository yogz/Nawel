"use server";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  auditLog,
  debts,
  outings,
  participants,
  purchaseAllocations,
  purchases,
} from "@drizzle/sortie-schema";
import { buildAllocationPlan } from "@/features/sortie/lib/allocation-plan";
import { priceFor } from "@/features/sortie/lib/price-for";
import { DebtLockError, recomputeDebtsForPurchase } from "@/features/sortie/lib/compute-debt-rows";
import {
  sendDebtGiftedEmail,
  sendPurchaseConfirmedEmails,
} from "@/features/sortie/lib/emails/send-money-emails";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { uploadPurchaseProof } from "@/features/sortie/lib/proof-upload";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { hashIp } from "@/features/sortie/lib/audit";
import { getCurrentParticipant } from "@/features/sortie/lib/current-participant";
import type { FormActionState } from "./outing-actions";
import { shortIdSchema } from "./schemas";

// Valeurs auditLog.action écrites par purchase-actions. Cohérent avec
// debt-actions:AUDIT_ACTION — varchar(64) libre côté Drizzle, donc une
// faute de frappe n'échoue pas au build mais brise la requêtabilité.
const AUDIT_ACTION = {
  PURCHASE_DECLARED: "PURCHASE_DECLARED",
  ALLOCATION_CEDED: "ALLOCATION_CEDED",
  ALLOCATION_GIFTED: "ALLOCATION_GIFTED",
} as const;

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

  const { participant: me, userId } = await getCurrentParticipant(outing.id);
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

  // priceFor() is the single source of truth (cf. lib/price-for.ts) — it lit
  // les colonnes purchase + allocation, donc on construit ici une vue
  // « purchase-like » à partir des données validées du form pour l'appeler.
  const purchaseShape = {
    pricingMode: data.pricingMode,
    uniquePriceCents: data.pricingMode === "unique" ? data.uniquePriceCents : null,
    adultPriceCents: data.pricingMode === "category" ? data.adultPriceCents : null,
    childPriceCents: data.pricingMode === "category" ? data.childPriceCents : null,
  };

  const allocationRows: (typeof purchaseAllocations.$inferInsert)[] = plan.map((entry, i) => ({
    purchaseId: "__placeholder__",
    participantId: entry.participantId,
    isChild: entry.isChild,
    nominalPriceCents: data.pricingMode === "nominal" ? data.allocationPriceCents[i] : null,
  }));

  // Aggregate each non-buyer's total into a single debt row.
  //
  // Volontairement PAS via `computeDebtRows` : à la déclaration d'achat il n'y
  // a pas encore de rows `purchase_allocations` (donc pas de `giftedAt`) — on
  // travaille sur le `plan` en mémoire + les prix du form. `computeDebtRows`
  // reste la source de vérité pour les *recalculs* (cession/offre/swap), où
  // les allocations existent en base. La Map ci-dessous alimente aussi
  // `sendPurchaseConfirmedEmails`.
  const debtsByParticipant = new Map<string, number>();
  plan.forEach((entry, i) => {
    if (entry.participantId === me.id) {
      return;
    }
    const amount = priceFor(purchaseShape, {
      isChild: entry.isChild,
      nominalPriceCents:
        data.pricingMode === "nominal" ? (data.allocationPriceCents[i] ?? null) : null,
    });
    debtsByParticipant.set(
      entry.participantId,
      (debtsByParticipant.get(entry.participantId) ?? 0) + amount
    );
  });

  const ipHash = await hashIp();
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

    await tx.insert(auditLog).values({
      outingId: outing.id,
      actorParticipantId: me.id,
      actorUserId: userId,
      action: AUDIT_ACTION.PURCHASE_DECLARED,
      ipHash,
      payload: JSON.stringify({
        purchaseId: purchase.id,
        totalPlaces,
        pricingMode: data.pricingMode,
        ghostBuyer: data.ghostBuyer,
      }),
    });

    // Filtre sur amount > 0 AVANT le check size : un achat à prix 0
    // (cadeau / prévente / abo) accumule des entrées à 0 dans la map
    // mais aucune dette à insérer. `.values([])` est rejeté par
    // Drizzle, donc on guard sur la liste filtrée elle-même.
    const debtRows = Array.from(debtsByParticipant.entries())
      .filter(([, amount]) => amount > 0)
      .map(([participantId, amount]) => ({
        outingId: outing.id,
        debtorParticipantId: participantId,
        creditorParticipantId: me.id,
        amountCents: amount,
      }));
    if (debtRows.length > 0) {
      await tx.insert(debts).values(debtRows);
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
  redirect(`/${canonical}/dettes?from=achat`);
}

const cessionSchema = z.object({
  shortId: shortIdSchema,
  allocationId: z.string().uuid(),
  targetParticipantId: z.string().uuid(),
});

/**
 * Transfers a single allocation from the current holder to another confirmed
 * participant. Recomputes the debt ledger for the whole purchase via the
 * shared `recomputeDebtsForPurchase` helper so the arithmetic stays consistent
 * — delta patches would be fragile (especially around zero crossings and
 * changed holders).
 *
 * Guardrails:
 *   - Only the current holder can cede.
 *   - A gifted allocation cannot be ceded — the gift is the buyer's call to
 *     make and to reverse (admin only), not something the beneficiary can pass
 *     along.
 *   - Target must be a confirmed (`response="yes"`) participant of the
 *     same outing, and not the buyer (the buyer already paid).
 *   - Blocked once any debt on this purchase has moved past `pending`
 *     (≠ `gifted`) — enforced inside `recomputeDebtsForPurchase` via
 *     `DebtLockError`.
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

  const { participant: me, userId } = await getCurrentParticipant(outing.id);
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
  if (allocation.giftedAt) {
    return { message: "Cette place t'a été offerte — tu ne peux pas la céder." };
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

  const gate = await rateLimit({
    key: `cede:${me.id}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  const ipHash = await hashIp();
  try {
    await db.transaction(async (tx) => {
      // Flip the allocation, then re-derive the whole ledger from the
      // post-swap allocations. The helper holds the `FOR UPDATE` lock and
      // throws `DebtLockError` if any debt has moved past `pending`.
      await tx
        .update(purchaseAllocations)
        .set({ participantId: targetParticipantId })
        .where(eq(purchaseAllocations.id, allocationId));

      await recomputeDebtsForPurchase(tx, allocation.purchase);

      await tx.insert(auditLog).values({
        outingId: outing.id,
        actorParticipantId: me.id,
        actorUserId: userId,
        action: AUDIT_ACTION.ALLOCATION_CEDED,
        ipHash,
        payload: JSON.stringify({
          allocationId,
          targetParticipantId,
          purchaseId: allocation.purchaseId,
        }),
      });
    });
  } catch (e) {
    if (e instanceof DebtLockError) {
      return { message: "Des paiements ont déjà été déclarés — la cession est bloquée." };
    }
    throw e;
  }

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}`);
  revalidatePath(`/${canonical}/dettes`);
  return {};
}

const giftSchema = z.object({
  shortId: shortIdSchema,
  allocationId: z.string().uuid(),
});

/**
 * « Offrir la place » — l'acheteur renonce à ce qu'un débiteur lui doit pour
 * une allocation précise. La place reste attribuée au débiteur ; seul son coût
 * sort du calcul de la dette (`gifted_at` posé sur l'allocation).
 *
 * Garde-fous :
 *   - Seul l'acheteur du purchase peut offrir (`purchaserParticipantId`).
 *   - On ne s'offre pas sa propre place d'acheteur (poserait un `gifted_at`
 *     orphelin — l'acheteur n'a jamais de dette).
 *   - `gifted_at IS NULL` dans le `WHERE` de l'UPDATE = idempotence : un
 *     double-clic concurrent ne pose la marque qu'une fois.
 *   - Bloqué si une dette de la sortie a dépassé `pending` (≠ `gifted`),
 *     via `DebtLockError`.
 *   - Non réversible côté acheteur : seul l'admin peut annuler l'offre.
 */
export async function giftAllocationAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = giftSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { shortId, allocationId } = parsed.data;

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }
  if (outing.status === "cancelled") {
    return { message: "Cette sortie est annulée." };
  }
  if (outing.status === "settled") {
    return { message: "Cette sortie est soldée — le bilan est clos." };
  }

  const { participant: me, userId } = await getCurrentParticipant(outing.id);
  if (!me) {
    return { message: "Non autorisé." };
  }

  const allocation = await db.query.purchaseAllocations.findFirst({
    where: eq(purchaseAllocations.id, allocationId),
    with: { purchase: true },
  });
  if (!allocation || allocation.purchase.outingId !== outing.id) {
    return { message: "Place introuvable." };
  }
  // Autorisation : seul l'acheteur peut offrir une place.
  if (allocation.purchase.purchaserParticipantId !== me.id) {
    return { message: "Seul l'acheteur peut offrir une place." };
  }
  // Offrir sa propre place d'acheteur n'a pas de sens (aucune dette) et
  // laisserait un `gifted_at` orphelin sans row `debts` correspondante.
  if (allocation.participantId === allocation.purchase.purchaserParticipantId) {
    return { message: "Cette place est la tienne — tu l'as déjà réglée." };
  }
  if (allocation.giftedAt) {
    return { message: "Cette place est déjà offerte." };
  }

  const gate = await rateLimit({
    key: `gift:${me.id}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  // Montant offert capturé avant l'update — l'audit doit pouvoir dire
  // « combien » sans rejouer le pricing historique.
  const amountForgoneCents = priceFor(allocation.purchase, allocation);
  const beneficiaryParticipantId = allocation.participantId;

  const ipHash = await hashIp();
  let beneficiaryFullyGifted = false;
  try {
    beneficiaryFullyGifted = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(purchaseAllocations)
        .set({ giftedAt: new Date() })
        .where(and(eq(purchaseAllocations.id, allocationId), isNull(purchaseAllocations.giftedAt)))
        .returning({ id: purchaseAllocations.id });
      // Déjà offerte par une requête concurrente — rien à recalculer ni logger.
      if (!row) {
        return false;
      }

      const computed = await recomputeDebtsForPurchase(tx, allocation.purchase);

      await tx.insert(auditLog).values({
        outingId: outing.id,
        actorParticipantId: me.id,
        actorUserId: userId,
        action: AUDIT_ACTION.ALLOCATION_GIFTED,
        ipHash,
        payload: JSON.stringify({
          allocationId,
          beneficiaryParticipantId,
          purchaseId: allocation.purchaseId,
          amountForgoneCents,
        }),
      });

      // Toutes les places du bénéficiaire offertes → on le prévient (sa dette
      // a disparu de /dettes). Offre partielle = pas d'email, le montant baisse
      // seulement.
      return computed.some(
        (r) => r.debtorParticipantId === beneficiaryParticipantId && r.status === "gifted"
      );
    });
  } catch (e) {
    if (e instanceof DebtLockError) {
      return { message: "Des paiements ont déjà été déclarés — l'offre est bloquée." };
    }
    throw e;
  }

  if (beneficiaryFullyGifted) {
    // Fire-and-forget — un Resend down ne doit pas annuler l'offre déjà écrite.
    await sendDebtGiftedEmail({
      outing: { title: outing.title, slug: outing.slug, shortId: outing.shortId },
      buyerParticipantId: me.id,
      beneficiaryParticipantId,
    });
  }

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}`);
  revalidatePath(`/${canonical}/dettes`);
  return {};
}
