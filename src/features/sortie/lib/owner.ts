/**
 * Identity de l'organisateur d'une sortie : rattachement par compte (userId)
 * OU par cookie hash (créateur anon). Vrai si l'un des deux match. Ne lit pas
 * de DB — comparaisons pures sur les rows déjà récupérées.
 *
 * Le second bras (cookieTokenHash) est gardé même quand un userId est lié
 * sur la sortie : un anon qui a bind son cookie au moment de la création
 * peut continuer à éditer depuis le même device, sans qu'on lui impose un
 * login a posteriori. Le creator-user prime quand les deux sont set.
 */
export function isOutingOwner(
  outing: { creatorUserId: string | null; creatorCookieTokenHash: string | null },
  identity: { userId: string | null | undefined; cookieTokenHash: string | null }
): boolean {
  if (identity.userId && outing.creatorUserId === identity.userId) {
    return true;
  }
  if (
    outing.creatorCookieTokenHash !== null &&
    identity.cookieTokenHash !== null &&
    outing.creatorCookieTokenHash === identity.cookieTokenHash
  ) {
    return true;
  }
  return false;
}
