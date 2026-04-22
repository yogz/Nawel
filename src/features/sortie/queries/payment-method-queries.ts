import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { purchaserPaymentMethods } from "@drizzle/sortie-schema";

/**
 * Returns non-sensitive rows (no encrypted value) for display. The actual
 * IBAN/phone is only served by a dedicated reveal action (added in Phase 3.B)
 * that logs the access and checks that the caller is an active debtor.
 */
export async function listPaymentMethodsForParticipant(participantId: string) {
  return db
    .select({
      id: purchaserPaymentMethods.id,
      type: purchaserPaymentMethods.type,
      valuePreview: purchaserPaymentMethods.valuePreview,
      displayLabel: purchaserPaymentMethods.displayLabel,
      createdAt: purchaserPaymentMethods.createdAt,
    })
    .from(purchaserPaymentMethods)
    .where(eq(purchaserPaymentMethods.participantId, participantId));
}

export type PaymentMethodPreview = Awaited<
  ReturnType<typeof listPaymentMethodsForParticipant>
>[number];
