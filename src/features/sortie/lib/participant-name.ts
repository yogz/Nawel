type WithNames = {
  anonName: string | null;
  user?: { name: string | null } | null;
};

/**
 * Resolves a participant's display name in preference order: the linked
 * user's account name → the anon name captured at RSVP → null when both
 * are blank. Callers typically fall back to "Quelqu'un" on null.
 *
 * Logged-in participants intentionally store `anonName = null` to keep the
 * user table as the single source of truth for their name; this helper
 * hides that split from the UI layer.
 */
export function displayNameOf(p: WithNames): string | null {
  const fromUser = p.user?.name?.trim();
  if (fromUser) {
    return fromUser;
  }
  const fromAnon = p.anonName?.trim();
  return fromAnon ? fromAnon : null;
}
