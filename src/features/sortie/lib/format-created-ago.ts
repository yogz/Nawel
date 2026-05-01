/**
 * Delta `createdAt` mono uppercase ("IL Y A 2 J") pour signer la
 * fraîcheur d'édition. Plafonne à "IL Y A 12 MOIS" — au-delà l'info
 * perd toute valeur de fraîcheur, et ces sorties ne devraient pas
 * atteindre le carrousel (filtre deadline future les exclut).
 */
export function formatCreatedAgo(createdAt: Date, now = new Date()): string {
  const diffMs = now.getTime() - createdAt.getTime();
  if (diffMs < 60_000) {
    return "À L'INSTANT";
  }
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) {
    return `IL Y A ${diffMin} MIN`;
  }
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 24) {
    return `IL Y A ${diffH} H`;
  }
  const diffD = Math.floor(diffMs / 86_400_000);
  if (diffD < 7) {
    return `IL Y A ${diffD} J`;
  }
  if (diffD < 30) {
    const weeks = Math.floor(diffD / 7);
    return `IL Y A ${weeks} SEM`;
  }
  const months = Math.min(12, Math.floor(diffD / 30));
  return `IL Y A ${months} MOIS`;
}
