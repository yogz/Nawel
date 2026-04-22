"use server";

import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import {
  debts,
  outings,
  participants,
  purchaseAllocations,
  purchases,
} from "@drizzle/sortie-schema";
import { buildAllocationPlan } from "@/features/sortie/lib/allocation-plan";
import { ensureParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { sendPurchaseConfirmedEmails } from "@/features/sortie/lib/emails/send-money-emails";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { uploadPurchaseProof } from "@/features/sortie/lib/proof-upload";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import type { FormActionState } from "./outing-actions";

const shortIdSchema = z
  .string()
  .trim()
  .regex(/^[23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);

const MAX_CENTS = 10_000_00;
const priceCents = z.coerce.number().int().min(0).max(MAX_CENTS);
const positivePriceCents = z.coerce.number().int().min(1).max(MAX_CENTS);

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
    uniquePriceCents: positivePriceCents,
    ghostBuyer: ghostBuyerFlag,
  }),
  z.object({
    shortId: shortIdSchema,
    pricingMode: z.literal("category"),
    adultPriceCents: positivePriceCents,
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

async function getCurrentParticipant(outingId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const cookieTokenHash = await ensureParticipantTokenHash();
  const userId = session?.user?.id ?? null;
  const row = await db.query.participants.findFirst({
    where: and(
      eq(participants.outingId, outingId),
      userId ? eq(participants.userId, userId) : eq(participants.cookieTokenHash, cookieTokenHash)
    ),
  });
  return row ?? null;
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

  const me = await getCurrentParticipant(outing.id);
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
      .set({ status: "purchased", updatedAt: new Date() })
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
