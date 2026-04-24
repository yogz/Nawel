/**
 * Derives the "back" link for a page based on the incoming `Referer`
 * header. Lets the outing page return to wherever the visitor actually
 * came from (a profile, their own /moi, etc.) without plumbing `from=`
 * through every `<Link>` in the app.
 *
 * Same-host only — a foreign site cannot dictate the label. Preserves
 * the referer's query string so `/@bob?k=...` round-trips the invite
 * token back to the profile page.
 */
export function resolveBackLink(
  referer: string | null,
  currentHost: string | null
): { href: string; label: string } {
  const fallback = { href: "/", label: "Accueil" };

  if (!referer || !currentHost) {
    return fallback;
  }

  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return fallback;
  }

  // Reject cross-host referers — a phishing page must not be able to
  // set our back link's label to something deceptive.
  if (url.host !== currentHost) {
    return fallback;
  }

  const path = url.pathname;
  const search = url.search;

  // `/@username` (including trailing segments) → label with the handle.
  if (path.startsWith("/@") && path.length > 2) {
    const username = decodeURIComponent(path.slice(2).split("/")[0] ?? "");
    if (username) {
      return { href: `/@${encodeURIComponent(username)}${search}`, label: `@${username}` };
    }
  }

  // `/moi` (and nested settings pages if any) → their own profile.
  if (path === "/moi" || path.startsWith("/moi/")) {
    return { href: "/moi", label: "Mon profil" };
  }

  // Home — keep the neutral "Accueil" label.
  return fallback;
}
