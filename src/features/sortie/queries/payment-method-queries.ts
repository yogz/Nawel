import { and, asc, eq, gt, isNotNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { purchaserPaymentMethods, userPaymentMethods } from "@drizzle/sortie-schema";

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

/**
 * Moyens enregistrés sur le compte, aperçus seulement (jamais le chiffré).
 * Les ajouts en attente dont le lien a expiré sont masqués : ils ne
 * pourront plus être confirmés (l'ajout suivant les nettoie).
 */
export async function listAccountPaymentMethods(userId: string, now: Date) {
  return db
    .select({
      id: userPaymentMethods.id,
      type: userPaymentMethods.type,
      valuePreview: userPaymentMethods.valuePreview,
      displayLabel: userPaymentMethods.displayLabel,
      confirmedAt: userPaymentMethods.confirmedAt,
    })
    .from(userPaymentMethods)
    .where(
      and(
        eq(userPaymentMethods.userId, userId),
        or(
          isNotNull(userPaymentMethods.confirmedAt),
          gt(userPaymentMethods.confirmTokenExpiresAt, now)
        )
      )
    )
    .orderBy(asc(userPaymentMethods.createdAt), asc(userPaymentMethods.id));
}
