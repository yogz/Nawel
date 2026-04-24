import { formatDateTimeForShare } from "@/features/sortie/lib/date-fr";
import { getCreatorFirstName } from "@/features/sortie/lib/creator-display";

const TITLE_MAX = 55;
const SOCIAL_PROOF_MIN = 3;

type OutingForShare = {
  title: string;
  location: string | null;
  fixedDatetime: Date | null;
  status: string;
  creatorAnonName: string | null;
  creatorUser?: { name: string | null } | null;
  participants: Array<{ response: string }>;
};

/**
 * Single source of truth for every share-preview surface:
 *   - `ogTitle`       → `og:title`          (≤ 55 chars, "{titre} — par {Léa}")
 *   - `ogDescription` → `og:description`    ("Samedi 20h30 · chez Léa · 8 déjà partants")
 *   - `shareTitle`    → shown in share sheets ("Léa t'invite : {titre}")
 *   - `confirmedCount`→ number of `yes` RSVPs, drives avatar-stack + social proof
 *
 * Both `generateMetadata` and the dynamic OG image read from here so copy
 * stays consistent across WhatsApp preview, <title>, and the generated image.
 * Cancelled outings get a distinct signalling copy so re-opened links
 * don't feel live.
 */
export function buildOutingShareMeta(outing: OutingForShare, now: Date = new Date()) {
  const firstName = getCreatorFirstName(outing);
  const rawTitle = outing.title.trim();
  const confirmedCount = outing.participants.filter((p) => p.response === "yes").length;

  if (outing.status === "cancelled") {
    return {
      ogTitle: "Sortie annulée",
      ogDescription: rawTitle ? `${truncate(rawTitle, 80)} n'aura pas lieu. À la prochaine !` : "",
      shareTitle: "Sortie annulée",
      confirmedCount: 0,
      firstName,
      isCancelled: true as const,
    };
  }

  const ogTitle = composeOgTitle(rawTitle, firstName, outing.fixedDatetime, now);
  const ogDescription = composeOgDescription({
    startsAt: outing.fixedDatetime,
    location: outing.location,
    confirmedCount,
    now,
  });
  const shareTitle = firstName
    ? `${firstName} t'invite : ${rawTitle || "Sortie"}`
    : rawTitle || "Sortie";

  return {
    ogTitle,
    ogDescription,
    shareTitle,
    confirmedCount,
    firstName,
    isCancelled: false as const,
  };
}

function composeOgTitle(
  rawTitle: string,
  firstName: string | null,
  startsAt: Date | null,
  now: Date
): string {
  // Empty / whitespace titles are a real case — anon creators sometimes
  // skip the field. Synthesise from the date so the preview is still useful.
  const effectiveTitle =
    rawTitle.length >= 3
      ? rawTitle
      : startsAt
        ? `Sortie du ${formatDateTimeForShare(startsAt, now)}`
        : "Sortie";
  if (!firstName) {
    return truncate(effectiveTitle, TITLE_MAX);
  }
  const suffix = ` — par ${firstName}`;
  // Budget title around the suffix so the attribution never gets chopped —
  // the suffix is the social proof, more important than a long descriptive tail.
  const budget = TITLE_MAX - suffix.length;
  return `${truncate(effectiveTitle, budget)}${suffix}`;
}

function composeOgDescription(args: {
  startsAt: Date | null;
  location: string | null;
  confirmedCount: number;
  now: Date;
}): string {
  const parts: string[] = [];
  if (args.startsAt) {
    parts.push(formatDateTimeForShare(args.startsAt, args.now));
  }
  if (args.location) {
    parts.push(args.location.trim());
  }
  // Only surface social proof past the threshold — "1 déjà partant" reads as
  // an empty event, inverting the effect. Experts converge on N ≥ 3.
  if (args.confirmedCount >= SOCIAL_PROOF_MIN) {
    parts.push(`${args.confirmedCount} déjà partants`);
  }
  return parts.join(" · ");
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  // Cut on a word boundary when possible — mid-word ellipsis looks sloppy
  // in a <title> bar and in WhatsApp previews.
  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}
