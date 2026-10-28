import { sanitizeStrictText } from "@/lib/sanitize";

/**
 * Revolut « Revtag » helpers. A buyer may paste their revolut.me link (or
 * Revolut's whole share sentence), "@pseudo" or a bare pseudo; a phone
 * number keeps the legacy copy-only behavior. Only the pseudo is ever
 * stored — the pay URL is rebuilt here on a fixed origin, so a buyer can't
 * smuggle a look-alike link to their debtors.
 *
 * Revtag charset/length below is our own guess (Revolut doesn't publish
 * it): strict enough to be path-safe and to never hide a phone number.
 */

export type RevolutInput = { kind: "tag"; tag: string } | { kind: "invalid" } | { kind: "other" };

const TAG_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
// Host must not be glued to a preceding label (evilrevolut.me, x.revolut.me).
const LINK_RE = /(?<![a-z0-9.-])(?:https?:\/\/)?(?:www\.)?revolut\.me\/([^\s?#]*)/gi;

function toTag(candidate: string): string | null {
  const tag = candidate.toLowerCase();
  if (!TAG_RE.test(tag) || tag.includes("..") || !/[a-z]/.test(tag)) {
    return null;
  }
  // Same spirit as validateMethodLabel: a long digit run is a phone number.
  if ((tag.match(/\d/g) ?? []).length >= 9) {
    return null;
  }
  return tag;
}

export function parseRevolutInput(raw: string): RevolutInput {
  const input = raw.trim();

  if (/revolut\.me/i.test(input)) {
    const tags = new Set<string | null>();
    for (const match of input.matchAll(LINK_RE)) {
      const segment = match[1].replace(/[.,;:!)]+$/, "").replace(/\/$/, "");
      tags.add(toTag(segment));
    }
    const [only] = [...tags];
    return tags.size === 1 && only ? { kind: "tag", tag: only } : { kind: "invalid" };
  }

  const atForm = /^@(\S+)$/.exec(input);
  if (atForm) {
    const tag = toTag(atForm[1]);
    return tag ? { kind: "tag", tag } : { kind: "invalid" };
  }
  if (input.startsWith("@")) {
    return { kind: "invalid" };
  }

  const bare = toTag(input);
  return bare ? { kind: "tag", tag: bare } : { kind: "other" };
}

const NOTE_MAX_CHARS = 64;

/**
 * revolut.me reads `amount` in minor units (owner-tested: 1250 → 12,50 €),
 * `currency` and a 64-char `note`.
 */
export function revolutPayUrl(args: {
  tag: string;
  amountCents: number;
  outingTitle: string;
}): string {
  const url = new URL("https://revolut.me/");
  url.pathname = `/${args.tag}`;
  if (url.origin !== "https://revolut.me") {
    throw new Error("Unexpected Revolut origin");
  }
  const note = `Sortie : ${sanitizeStrictText(args.outingTitle, 200)}`;
  url.searchParams.set("amount", String(args.amountCents));
  url.searchParams.set("currency", "EUR");
  // Array.from slices by code point, so an emoji is never cut in half.
  url.searchParams.set("note", Array.from(note).slice(0, NOTE_MAX_CHARS).join(""));
  return url.toString();
}
