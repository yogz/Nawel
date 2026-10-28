import { createHash } from "node:crypto";
import { getClientIp } from "./rate-limit";

/**
 * SHA-256 of the client IP + the BETTER_AUTH_SECRET pepper. The pepper makes
 * the hash unjoinable across deployments — a leaked audit-log dump on its
 * own can't be cross-referenced with another logger to identify a user. Used
 * by every audit insert; returns null when the IP is not resolvable so the
 * column stays nullable rather than logging a sentinel like "unknown".
 */
export async function hashIp(): Promise<string | null> {
  const ip = await getClientIp();
  if (!ip || ip === "unknown") {
    return null;
  }
  const pepper = process.env.BETTER_AUTH_SECRET ?? "";
  return createHash("sha256")
    .update(ip + pepper)
    .digest("hex");
}

/**
 * Cycle de vie de la date d'une sortie en mode sondage. Ces deux actions
 * n'étaient pas journalisées : l'enquête sur l'incident dMekC3qK a dû
 * reconstituer une réouverture à partir d'un `outings.updated_at` orphelin,
 * en la déduisant par élimination.
 */
export const OUTING_AUDIT_ACTION = {
  TIMESLOT_PICKED: "TIMESLOT_PICKED",
  POLL_REOPENED: "POLL_REOPENED",
  // « Qui vient ? » d'une sortie billets déjà pris (compteurs, sans adresses).
  PARTICIPANTS_SET_BY_CREATOR: "OUTING_PARTICIPANTS_SET_BY_CREATOR",
} as const;

export const TICKET_AUDIT_ACTION = {
  TICKET_UPLOADED: "TICKET_UPLOADED",
  TICKET_REVOKED: "TICKET_REVOKED",
  TICKET_DOWNLOADED: "TICKET_DOWNLOADED",
  TICKET_DOWNLOAD_DENIED: "TICKET_DOWNLOAD_DENIED",
} as const;

export const DEBT_AUDIT_ACTION = {
  DEBT_DECLARED_PAID: "DEBT_DECLARED_PAID",
  DEBT_CONFIRMED: "DEBT_CONFIRMED",
  DEBT_REMINDED: "DEBT_REMINDED",
  IBAN_REVEALED: "IBAN_REVEALED",
  BULK_DEBTS_REMINDED: "BULK_DEBTS_REMINDED",
  BULK_DEBTS_DECLARED_PAID: "BULK_DEBTS_DECLARED_PAID",
  BULK_DEBTS_SETTLED: "BULK_DEBTS_SETTLED",
  BULK_EMAIL_SEND_FAILED: "BULK_EMAIL_SEND_FAILED",
} as const;

/**
 * Moyens de paiement enregistrés sur le compte (spec 2026-10-28 §5 bis).
 * Payload : `{ methodId, type, valuePreview }` — jamais la valeur claire ;
 * `outing_id` nul, l'action ne concerne aucune sortie.
 */
export const ACCOUNT_PAYMENT_AUDIT_ACTION = {
  USER_PAYMENT_METHOD_ADDED: "USER_PAYMENT_METHOD_ADDED",
  USER_PAYMENT_METHOD_CONFIRMED: "USER_PAYMENT_METHOD_CONFIRMED",
  USER_PAYMENT_METHOD_REMOVED: "USER_PAYMENT_METHOD_REMOVED",
  // Copie (chiffré tel quel) vers purchaser_payment_methods à la déclaration
  // d'un achat. Payload : `{ purchaseId, count, types, sourceMethodIds }`.
  PAYMENT_METHODS_COPIED_FROM_ACCOUNT: "PAYMENT_METHODS_COPIED_FROM_ACCOUNT",
} as const;
