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
import {
  changedDebtAmounts,
  DebtLockError,
  recomputeDebtsForPurchase,
  type ComputedDebtRow,
} from "@/features/sortie/lib/compute-debt-rows";
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
  PURCHASE_PRICE_EDITED: "PURCHASE_PRICE_EDITED",
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

// Édition du prix d'un achat déjà déclaré. Contrairement à la déclaration :
//  - pas de `ghostBuyer` ni de re-dérivation du plan : on ne touche jamais
//    QUI est servi (totalPlaces invariant), seulement les montants ;
//  - le mode de tarif ne peut pas changer (vérifié côté serveur contre le
//    purchase existant) — le form n'affiche que les champs du mode courant ;
//  - en nominal, on cible chaque allocation par son `allocationId` (pas par
//    index de plan), envoyées en JSON dans un champ caché.
const editPurchaseSchema = z.discriminatedUnion("pricingMode", [
  z.object({
    shortId: shortIdSchema,
    pricingMode: z.literal("unique"),
    uniquePriceCents: priceCents,
  }),
  z.object({
    shortId: shortIdSchema,
    pricingMode: z.literal("category"),
    adultPriceCents: priceCents,
    childPriceCents: priceCents,
  }),
  z.object({
    shortId: shortIdSchema,
    pricingMode: z.literal("nominal"),
    allocationPrices: z.preprocess(
      (raw) => {
        if (typeof raw !== "string" || raw.length === 0) {
          return undefined;
        }
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      },
      z
        .array(z.object({ allocationId: z.string().uuid(), priceCents }))
        .min(1)
        .max(100)
    ),
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

/**
 * Modifie le prix d'un achat déjà déclaré et recalcule les dettes. Même
 * pattern que cede/gift : on mute l'état (colonnes prix de `purchases` ou
 * `nominalPriceCents` des allocations), puis `recomputeDebtsForPurchase`
 * re-dérive tout le ledger dans la même transaction — verrou `FOR UPDATE`
 * inclus, `DebtLockError` si un paiement a déjà été déclaré.
 *
 * Garde-fous :
 *   - Seul l'acheteur (`purchaserParticipantId`) peut modifier le prix.
 *   - Refusé si la sortie est annulée ou soldée.
 *   - Le mode de tarif ne peut PAS changer (sinon il faudrait re-router les
 *     allocations) — pour changer de mode, c'est un autre flux.
 *   - `totalPlaces` est invariant : on ne touche jamais qui est servi.
 */
export async function editPurchaseAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = editPurchaseSchema.safeParse(formDataToObject(formData));
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
  if (outing.status === "settled") {
    return { message: "Cette sortie est soldée — le bilan est clos." };
  }

  const { participant: me, userId } = await getCurrentParticipant(outing.id);
  if (!me) {
    return { message: "Non autorisé." };
  }

  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.outingId, outing.id),
  });
  if (!purchase) {
    return { message: "Aucun achat à modifier." };
  }
  if (purchase.purchaserParticipantId !== me.id) {
    return { message: "Seul l'acheteur peut modifier le prix." };
  }
  if (purchase.pricingMode !== data.pricingMode) {
    return { message: "Le mode de tarif ne peut pas changer ici." };
  }

  const gate = await rateLimit({
    key: `editprice:${me.id}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  // En nominal, l'ensemble des allocationId reçus doit couvrir exactement les
  // allocations de l'achat (sinon la page a été éditée avec un état périmé).
  const allocPriceById = new Map<string, number>();
  if (data.pricingMode === "nominal") {
    const allocs = await db
      .select({ id: purchaseAllocations.id })
      .from(purchaseAllocations)
      .where(eq(purchaseAllocations.purchaseId, purchase.id));
    const dbIds = new Set(allocs.map((a) => a.id));
    const formIds = new Set(data.allocationPrices.map((a) => a.allocationId));
    const sameSet = dbIds.size === formIds.size && [...dbIds].every((id) => formIds.has(id));
    if (!sameSet) {
      return { message: "La liste des places a changé. Recharge la page et réessaie." };
    }
    for (const a of data.allocationPrices) {
      allocPriceById.set(a.allocationId, a.priceCents);
    }
  }

  // Snapshot AVANT pour l'audit before/after.
  const before = {
    pricingMode: purchase.pricingMode,
    uniquePriceCents: purchase.uniquePriceCents,
    adultPriceCents: purchase.adultPriceCents,
    childPriceCents: purchase.childPriceCents,
  };

  // Objet purchase porteur des NOUVEAUX prix — `recomputeDebtsForPurchase` le
  // passe à `priceFor` pour les modes unique/category. (En nominal, le prix
  // vit sur les allocations qu'on met à jour dans la transaction ci-dessous,
  // donc recompute les relit à jour.) Piège classique : recalculer avec
  // l'ancien objet recalculerait au tarif périmé.
  const updatedPurchase = {
    ...purchase,
    uniquePriceCents:
      data.pricingMode === "unique" ? data.uniquePriceCents : purchase.uniquePriceCents,
    adultPriceCents:
      data.pricingMode === "category" ? data.adultPriceCents : purchase.adultPriceCents,
    childPriceCents:
      data.pricingMode === "category" ? data.childPriceCents : purchase.childPriceCents,
  };

  // Dettes AVANT édition (créancier = acheteur), pour ne notifier que les
  // débiteurs dont le montant change réellement.
  const debtsBefore = new Map<string, number>();
  const existingDebts = await db
    .select({ debtor: debts.debtorParticipantId, amount: debts.amountCents })
    .from(debts)
    .where(and(eq(debts.outingId, outing.id), eq(debts.creditorParticipantId, me.id)));
  for (const d of existingDebts) {
    debtsBefore.set(d.debtor, d.amount);
  }

  const ipHash = await hashIp();
  let computed: ComputedDebtRow[] = [];
  try {
    await db.transaction(async (tx) => {
      if (data.pricingMode === "unique") {
        await tx
          .update(purchases)
          .set({ uniquePriceCents: data.uniquePriceCents })
          .where(eq(purchases.id, purchase.id));
      } else if (data.pricingMode === "category") {
        await tx
          .update(purchases)
          .set({ adultPriceCents: data.adultPriceCents, childPriceCents: data.childPriceCents })
          .where(eq(purchases.id, purchase.id));
      } else {
        for (const [allocationId, price] of allocPriceById) {
          await tx
            .update(purchaseAllocations)
            .set({ nominalPriceCents: price })
            .where(eq(purchaseAllocations.id, allocationId));
        }
      }

      computed = await recomputeDebtsForPurchase(tx, updatedPurchase);

      await tx.insert(auditLog).values({
        outingId: outing.id,
        actorParticipantId: me.id,
        actorUserId: userId,
        action: AUDIT_ACTION.PURCHASE_PRICE_EDITED,
        ipHash,
        payload: JSON.stringify({
          purchaseId: purchase.id,
          before,
          after: {
            pricingMode: data.pricingMode,
            uniquePriceCents: updatedPurchase.uniquePriceCents,
            adultPriceCents: updatedPurchase.adultPriceCents,
            childPriceCents: updatedPurchase.childPriceCents,
            ...(data.pricingMode === "nominal"
              ? { allocationPrices: Array.from(allocPriceById.entries()) }
              : {}),
          },
        }),
      });
    });
  } catch (e) {
    if (e instanceof DebtLockError) {
      return {
        message: "Des paiements ont déjà été déclarés — le prix ne peut plus être modifié.",
      };
    }
    throw e;
  }

  // Notifie — hors transaction, best-effort — les débiteurs dont le montant a
  // changé (un Resend down ne doit jamais annuler l'édition déjà écrite).
  const debtsAfter = new Map(computed.map((r) => [r.debtorParticipantId, r.amountCents]));
  const changed = changedDebtAmounts(debtsBefore, debtsAfter);
  if (changed.size > 0) {
    await sendPurchaseConfirmedEmails({
      outing: {
        title: outing.title,
        fixedDatetime: outing.fixedDatetime,
        slug: outing.slug,
        shortId: outing.shortId,
      },
      buyerParticipantId: me.id,
      debts: changed,
    });
  }

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}`);
  revalidatePath(`/${canonical}/dettes`);
  revalidatePath(`/${canonical}/achat/modifier`);
  redirect(`/${canonical}/dettes`);
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
