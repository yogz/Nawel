// Source unique des labels `audit_log.action` posés par les overrides admin.
// Importé par les actions admin (write) et les queries de lecture (read)
// pour qu'un renommage ne désync pas l'écriture et la requête.
export const ADMIN_AUDIT = {
  // Dettes / achats
  PURCHASE_ADMIN_PURCHASER_SWAPPED: "PURCHASE_ADMIN_PURCHASER_SWAPPED",
  DEBT_ADMIN_STATUS_OVERRIDE: "DEBT_ADMIN_STATUS_OVERRIDE",
  DEBT_ADMIN_AMOUNT_UPDATED: "DEBT_ADMIN_AMOUNT_UPDATED",
  DEBT_ADMIN_DELETED: "DEBT_ADMIN_DELETED",
  // Users (création / édition / promotion role)
  USER_ADMIN_CREATED: "USER_ADMIN_CREATED",
  USER_ADMIN_UPDATED: "USER_ADMIN_UPDATED",
  USER_ADMIN_ROLE_PROMOTED: "USER_ADMIN_ROLE_PROMOTED",
  USER_ADMIN_ROLE_DEMOTED: "USER_ADMIN_ROLE_DEMOTED",
  // Sorties (assignation participant / changement créateur)
  OUTING_ADMIN_PARTICIPANT_ASSIGNED: "OUTING_ADMIN_PARTICIPANT_ASSIGNED",
  OUTING_ADMIN_CREATOR_CHANGED: "OUTING_ADMIN_CREATOR_CHANGED",
  // Sécurité (reset 2FA — loggué depuis scripts/admin/reset-2fa.ts)
  ADMIN_2FA_RESET: "ADMIN_2FA_RESET",
} as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT)[keyof typeof ADMIN_AUDIT];
