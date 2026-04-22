"use server";

import { and, eq } from "drizzle-orm";
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
import { ensureParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import type { FormActionState } from "./outing-actions";

const shortIdSchema = z
  .string()
  .trim()
  .regex(/^[23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);

// Phase 3.A: unique-price mode only. Category + per-seat modes in 3.B.
const declarePurchaseSchema = z.object({
  shortId: shortIdSchema,
  pricingMode: z.literal("unique"),
  uniquePriceCents: z.coerce.number().int().min(1).max(10_000_00),
});

function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    obj[k] = typeof v === "string" ? v : "";
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

  // Pull every "yes" participant + their counts so we can auto-allocate seats
  // and compute one debt row per non-buyer participant.
  const yesRows = await db
    .select({
      id: participants.id,
      extraAdults: participants.extraAdults,
      extraChildren: participants.extraChildren,
    })
    .from(participants)
    .where(and(eq(participants.outingId, outing.id), eq(participants.response, "yes")));

  if (yesRows.length === 0) {
    return { message: "Aucun confirmé — rien à acheter." };
  }

  const totalPlaces = yesRows.reduce((acc, p) => acc + 1 + p.extraAdults + p.extraChildren, 0);
  const priceCents = data.uniquePriceCents;

  await db.transaction(async (tx) => {
    const [purchase] = await tx
      .insert(purchases)
      .values({
        outingId: outing.id,
        purchaserParticipantId: me.id,
        totalPlaces,
        pricingMode: "unique",
        uniquePriceCents: priceCents,
      })
      .returning({ id: purchases.id });

    // Flat allocation: one row per seat. isChild marks the children so we
    // keep the info around for when Phase 3.B introduces category pricing.
    const allocationRows: (typeof purchaseAllocations.$inferInsert)[] = [];
    const debtRows: (typeof debts.$inferInsert)[] = [];

    for (const p of yesRows) {
      const adultSeats = 1 + p.extraAdults;
      const childSeats = p.extraChildren;
      for (let i = 0; i < adultSeats; i++) {
        allocationRows.push({ purchaseId: purchase.id, participantId: p.id, isChild: false });
      }
      for (let i = 0; i < childSeats; i++) {
        allocationRows.push({ purchaseId: purchase.id, participantId: p.id, isChild: true });
      }
      if (p.id !== me.id) {
        const seats = adultSeats + childSeats;
        debtRows.push({
          outingId: outing.id,
          debtorParticipantId: p.id,
          creditorParticipantId: me.id,
          amountCents: seats * priceCents,
        });
      }
    }

    if (allocationRows.length > 0) {
      await tx.insert(purchaseAllocations).values(allocationRows);
    }
    if (debtRows.length > 0) {
      await tx.insert(debts).values(debtRows);
    }
    await tx
      .update(outings)
      .set({ status: "purchased", updatedAt: new Date() })
      .where(eq(outings.id, outing.id));
  });

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}`);
  revalidatePath(`/${canonical}/dettes`);
  redirect(`/${canonical}/dettes`);
}
