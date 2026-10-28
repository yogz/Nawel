import { ibanPreview, normalizeIban, phonePreview } from "./iban";
import { parseRevolutInput } from "./revolut";

export type PaymentMethodType = "iban" | "lydia" | "revolut" | "wero";

type CanonicalValue =
  | { ok: true; canonical: string; preview: string }
  | { ok: false; message: string };

const REVOLUT_REFUSED = "Lien Revolut non reconnu. Colle ton lien revolut.me ou ton numéro.";
// Legacy bounds of handleValueSchema, kept for Revolut values that are not
// a pseudo (phone numbers).
const HANDLE_MIN = 4;
const HANDLE_MAX = 50;

/**
 * Debtor-side order: a Revolut pseudo (one-tap « Payer » link) comes first,
 * everything else keeps the order it was given in (callers sort by
 * creation). Owner decision 2026-10-28: Revolut by default, the rest as
 * backup — no per-user "default" setting.
 */
export function payLinkFirst<T extends { type: string; valuePreview: string }>(methods: T[]): T[] {
  const hasPayLink = (m: T) => m.type === "revolut" && m.valuePreview.startsWith("@");
  return [...methods.filter(hasPayLink), ...methods.filter((m) => !hasPayLink(m))];
}

/**
 * Copy of the value field in both "add a payment method" forms. Hints are
 * truncated ("…") so nobody mistakes them for an already filled value.
 */
export function valueFieldCopy(type: PaymentMethodType): {
  label: string;
  hint: string;
  inputType: "text" | "tel";
} {
  if (type === "iban") {
    return { label: "IBAN", hint: "FR76 1234 5678 …………", inputType: "text" };
  }
  if (type === "revolut") {
    return {
      label: "Lien revolut.me ou numéro",
      hint: "revolut.me/… ou +33 6 34 56 …",
      inputType: "text",
    };
  }
  return { label: "Numéro de téléphone", hint: "+33 6 34 56 …", inputType: "tel" };
}

/**
 * Value actually stored (encrypted) and its public preview — shared by the
 * per-outing and account-level "add a payment method" actions. A Revolut
 * pseudo is stored as "@tag" and shown in full: it's a public pay handle,
 * and the full preview keeps duplicate detection exact.
 */
export function canonicalPaymentValue(type: PaymentMethodType, raw: string): CanonicalValue {
  if (type === "iban") {
    const canonical = normalizeIban(raw);
    return { ok: true, canonical, preview: ibanPreview(canonical) };
  }
  const trimmed = raw.trim();
  if (type === "revolut") {
    const parsed = parseRevolutInput(trimmed);
    if (parsed.kind === "tag") {
      return { ok: true, canonical: `@${parsed.tag}`, preview: `@${parsed.tag}` };
    }
    if (parsed.kind === "invalid" || trimmed.length < HANDLE_MIN || trimmed.length > HANDLE_MAX) {
      return { ok: false, message: REVOLUT_REFUSED };
    }
  }
  return { ok: true, canonical: trimmed, preview: phonePreview(trimmed) };
}
