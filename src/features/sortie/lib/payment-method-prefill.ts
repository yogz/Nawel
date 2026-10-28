"use client";

import { sendGAEvent } from "@/lib/umami";
import type { PaymentMethodPreview } from "@/features/sortie/queries/payment-method-queries";

type PaymentMethodType = PaymentMethodPreview["type"];

// Ancien cache : le dernier IBAN / numéro saisi était gardé EN CLAIR dans le
// navigateur pour pré-remplir le formulaire. Supprimé (spec 2026-10-28
// moyens de paiement sur le compte, §5 bis) : le compte remplace ce confort.
// On ne fait plus que purger ce qui traîne encore.
const LEGACY_KEY_PREFIX = "sortie:lastPM:";
const LEGACY_TYPES: PaymentMethodType[] = ["iban", "lydia", "revolut", "wero"];

/** Efface les valeurs en clair laissées par l'ancien pré-remplissage. */
export function purgeLegacyPrefill(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    for (const type of LEGACY_TYPES) {
      window.localStorage.removeItem(LEGACY_KEY_PREFIX + type);
    }
  } catch {
    // Privacy mode / stockage désactivé — rien à purger.
  }
}

export function trackPaymentMethodAdded(type: PaymentMethodType) {
  sendGAEvent("event", "payment_method_added", { type });
}
