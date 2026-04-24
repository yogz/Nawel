/**
 * First-name extraction for share previews ("Léa t'invite…").
 *
 * Creators can be logged-in users (`creatorUser.name`) or anon
 * (`creatorAnonName`). We show only the first word because meta-title
 * space is tight and "Léa Martin t'invite à Raclette" feels formal vs
 * the intimate tone we want.
 */
export function getCreatorFirstName(outing: {
  creatorAnonName: string | null;
  creatorUser?: { name: string | null } | null;
}): string | null {
  const full = outing.creatorAnonName ?? outing.creatorUser?.name ?? null;
  if (!full) {
    return null;
  }
  const first = full.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : null;
}
