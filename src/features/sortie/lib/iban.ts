/**
 * IBAN helpers. Validates the ISO 13616 mod-97 checksum, normalizes spacing,
 * and produces the public-facing preview ("FR76 **** 1234") used in UI so the
 * full value never appears outside the reveal-on-demand action.
 */

export function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/**
 * Mod-97 checksum per ISO 13616. Returns false for any non-conforming input
 * (wrong length, wrong country code, wrong characters). Never throws.
 */
export function isValidIban(raw: string): boolean {
  const iban = normalizeIban(raw);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) {
    return false;
  }
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  try {
    return BigInt(numeric) % 97n === 1n;
  } catch {
    return false;
  }
}

/**
 * Build the masked preview shown in UI. Keeps the country prefix + the last 4
 * digits so a debtor can still eyeball which account they're paying to.
 */
export function ibanPreview(raw: string): string {
  const iban = normalizeIban(raw);
  if (iban.length < 8) {
    return "****";
  }
  const head = iban.slice(0, 4);
  const tail = iban.slice(-4);
  return `${head} **** ${tail}`;
}

/**
 * Mask a French-formatted phone number (kept loose: any digits) for Lydia,
 * Revolut, Wero previews. Example: "+33 6 12 34 56 78" → "+33 6 ** ** ** 78".
 */
export function phonePreview(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.length < 4) {
    return "****";
  }
  const tail = digits.slice(-2);
  if (digits.startsWith("+33")) {
    return `+33 6 ** ** ** ${tail}`;
  }
  return `** ** ** ${tail}`;
}
