const SHORT_ID_REGEX = /^[23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;

/**
 * Accepts either the bare short_id or a slug-prefixed form (<slug>-<short_id>).
 * Returns the short_id so the query layer has a single input shape.
 */
export function extractShortId(input: string): string | null {
  if (SHORT_ID_REGEX.test(input)) {
    return input;
  }
  const lastDash = input.lastIndexOf("-");
  if (lastDash === -1) {
    return null;
  }
  const tail = input.slice(lastDash + 1);
  return SHORT_ID_REGEX.test(tail) ? tail : null;
}

/**
 * Rebuilds the canonical URL-path segment for an outing. Used to redirect
 * visitors who arrived at /short_id to the SEO-friendlier /slug-short_id.
 */
export function canonicalPathSegment(args: { slug: string | null; shortId: string }): string {
  return args.slug ? `${args.slug}-${args.shortId}` : args.shortId;
}
