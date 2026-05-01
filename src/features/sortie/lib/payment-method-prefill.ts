"use client";

import { sendGAEvent } from "@/lib/umami";
import type { PaymentMethodPreview } from "@/features/sortie/queries/payment-method-queries";

type PaymentMethodType = PaymentMethodPreview["type"];

const KEY_PREFIX = "sortie:lastPM:";

export function readLastValue(type: PaymentMethodType): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(KEY_PREFIX + type);
  } catch {
    // Privacy mode / quota exceeded / disabled storage — silently degrade.
    return null;
  }
}

export function saveLastValue(type: PaymentMethodType, value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(KEY_PREFIX + type, value);
  } catch {
    // Same as read — non-critical.
  }
}

type Payload = Record<string, string | number | boolean | undefined>;

function track(name: string, payload?: Payload) {
  sendGAEvent("event", name, payload);
}

export function trackPaymentMethodPrefilled(type: PaymentMethodType) {
  track("payment_method_prefilled", { type });
}

// `value_unchanged` = la valeur soumise est identique au prefill ; signal
// principal pour décider de promouvoir le cache localStorage en table serveur.
export function trackPaymentMethodAdded(params: {
  type: PaymentMethodType;
  wasPrefilled: boolean;
  valueUnchanged: boolean;
}) {
  track("payment_method_added", {
    type: params.type,
    was_prefilled: params.wasPrefilled,
    value_unchanged: params.valueUnchanged,
  });
}
