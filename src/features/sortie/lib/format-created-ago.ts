/**
 * Delta `createdAt` formaté en mono uppercase pour l'overlay des cards
 * du carrousel "derniers ajoutés". Voix éditoriale Sortie : court,
 * télégraphique, en majuscules — pas de prose ("il y a deux jours" →
 * "IL Y A 2J"). Granularité décroissante au fil du temps : on cesse
 * d'être précis quand l'info perd sa valeur de "fraîcheur".
 *
 *   < 1 min        → "À L'INSTANT"
 *   < 60 min       → "IL Y A 12 MIN"
 *   < 24 h         → "IL Y A 3 H"
 *   < 7 j          → "IL Y A 2 J"
 *   < 30 j         → "IL Y A 3 SEM"
 *   ≥ 30 j         → "IL Y A 2 MOIS"
 *
 * Au-delà de 30 jours, on bascule en mois plutôt que de tenter une
 * date absolue : sur le carrousel "derniers ajoutés", l'absolu n'a pas
 * sa place — c'est la chronologie d'édition qui compte, pas le
 * calendrier. Pour les sorties très anciennes (> 12 mois), on plafonne
 * à "IL Y A 12 MOIS" plutôt qu'introduire un format années — ces
 * sorties ne devraient pas atteindre le carrousel (filtre deadline
 * future les exclut presque toujours).
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
