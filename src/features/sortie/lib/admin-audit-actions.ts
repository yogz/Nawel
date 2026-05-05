// Source unique des labels `audit_log.action` posés par les overrides admin.
// Importé par `admin-debt-actions.ts` (write) et `admin-debt-queries.ts`
// (read) pour qu'un renommage ne désync pas l'écriture et la requête.
export const ADMIN_AUDIT = {
  PURCHASE_ADMIN_PURCHASER_SWAPPED: "PURCHASE_ADMIN_PURCHASER_SWAPPED",
  DEBT_ADMIN_STATUS_OVERRIDE: "DEBT_ADMIN_STATUS_OVERRIDE",
  DEBT_ADMIN_AMOUNT_UPDATED: "DEBT_ADMIN_AMOUNT_UPDATED",
  DEBT_ADMIN_DELETED: "DEBT_ADMIN_DELETED",
} as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT)[keyof typeof ADMIN_AUDIT];
