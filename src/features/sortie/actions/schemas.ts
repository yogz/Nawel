import { z } from "zod";

const trimmedString = z.string().trim();

const shortIdSchema = z
  .string()
  .trim()
  .regex(/^[23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);

// z.string().url() accepts javascript: — refine to http/https so a malicious
// creator can't turn the "Voir la billetterie" link into an XSS payload.
const safeHttpUrl = z
  .string()
  .url()
  .max(2048)
  .refine((u) => {
    try {
      const p = new URL(u).protocol;
      return p === "https:" || p === "http:";
    } catch {
      return false;
    }
  }, "L'URL doit commencer par https:// ou http://");

// `.optional()` is mandatory here — when a form doesn't include the field
// at all, Zod receives `undefined`, and a bare union would reject that
// with "Invalid input". The literal "" branch only catches form-posted
// empty strings, not omitted keys.
const optionalSafeUrl = z
  .union([z.literal(""), safeHttpUrl])
  .optional()
  .transform((v) => v || undefined);

// Vote mode creators send their timeslots as a JSON-encoded array in a hidden
// form field — this schema validates one parsed entry. Using coerce.date() so
// the server accepts `datetime-local`-shaped strings without a manual Date()
// on the client.
const timeslotInputSchema = z.object({
  startsAt: z.coerce.date(),
  position: z.coerce.number().int().min(0).max(20),
});

// Votes array shipped by RSVP-in-vote-mode submissions. Same JSON-in-hidden-
// field approach: one row per timeslot the participant has an opinion on.
// Missing rows = "didn't vote on this slot" (distinct from "voted no").
const timeslotVoteInputSchema = z.object({
  timeslotId: z.string().uuid(),
  available: z.boolean(),
});

// When the user doesn't set a deadline explicitly we derive one based on
// how far out the event is:
//   - less than a week away → 24h before   (spontaneous plans)
//   - 1–4 weeks away        → 1 week       (popular theatre/cinema)
//   - 1–3 months away       → 2 weeks      (concerts in advance)
//   - 3+ months away        → 3 weeks      (operas, big venues)
// The user still sees the computed date on the form and can override.
// Exposed as a helper so the client-side preview uses the same logic the
// server does.
export function computeDeadlineOffsetMs(startsAt: Date, now: Date = new Date()): number {
  const daysOut = (startsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (daysOut < 7) {
    return 24 * 60 * 60 * 1000;
  }
  if (daysOut < 30) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  if (daysOut < 90) {
    return 14 * 24 * 60 * 60 * 1000;
  }
  return 21 * 24 * 60 * 60 * 1000;
}

export const createOutingSchema = z
  .object({
    title: trimmedString.min(1).max(200),
    venue: trimmedString
      .max(200)
      .optional()
      .or(z.literal(""))
      .transform((v) => v || undefined),
    mode: z.enum(["fixed", "vote"]).default("fixed"),
    // Present only when mode === "fixed".
    startsAt: z.coerce.date().optional(),
    // Present only when mode === "vote" — JSON-encoded in the form field so
    // we don't have to invent a repeating-name convention in FormData.
    timeslots: z.preprocess((raw) => {
      if (typeof raw !== "string" || raw.length === 0) {
        return undefined;
      }
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }, z.array(timeslotInputSchema).min(2).max(8).optional()),
    // Optional on the form — derived server-side when missing.
    rsvpDeadline: z
      .union([z.literal(""), z.coerce.date()])
      .optional()
      .transform((v) => (v instanceof Date ? v : undefined)),
    ticketUrl: optionalSafeUrl,
    // Hero image URL — populated by the paster when it finds an `og:image`
    // on the ticket site. Same protocol refinement as `ticketUrl` so a
    // malicious source can't slip a `javascript:` URL through.
    heroImageUrl: optionalSafeUrl,
    creatorDisplayName: trimmedString.min(1).max(100),
    creatorEmail: z
      .union([z.literal(""), z.string().email().max(255)])
      .optional()
      .transform((v) => v || undefined),
    showOnProfile: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "fixed") {
      if (!data.startsAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["startsAt"],
          message: "La date est requise.",
        });
        return;
      }
      if (data.rsvpDeadline && data.rsvpDeadline >= data.startsAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rsvpDeadline"],
          message: "La deadline doit être avant la date de la sortie.",
        });
      }
    } else {
      if (!data.timeslots || data.timeslots.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["timeslots"],
          message: "Au moins deux créneaux pour un sondage.",
        });
        return;
      }
      const earliest = data.timeslots.reduce(
        (min, t) => (t.startsAt < min ? t.startsAt : min),
        data.timeslots[0].startsAt
      );
      if (data.rsvpDeadline && data.rsvpDeadline >= earliest) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rsvpDeadline"],
          message: "La deadline doit être avant le premier créneau.",
        });
      }
    }
  });

/**
 * Derives the RSVP/vote closure deadline when the creator didn't set one.
 * Scales the offset by how far out the event is — see
 * `computeDeadlineOffsetMs`. Keeps the logic outside the Zod schema so the
 * inferred type of the parsed object stays clean (no `Date | undefined` →
 * narrow gymnastics at the call site).
 */
export function resolveDeadline(data: {
  rsvpDeadline: Date | undefined;
  mode: "fixed" | "vote";
  startsAt: Date | undefined;
  timeslots: { startsAt: Date }[] | undefined;
}): Date {
  if (data.rsvpDeadline) {
    return data.rsvpDeadline;
  }
  let anchor: Date | null = null;
  if (data.mode === "fixed" && data.startsAt) {
    anchor = data.startsAt;
  } else if (data.mode === "vote" && data.timeslots && data.timeslots.length > 0) {
    anchor = data.timeslots.reduce(
      (min, t) => (t.startsAt < min ? t.startsAt : min),
      data.timeslots[0].startsAt
    );
  }
  if (!anchor) {
    return new Date();
  }
  const offset = computeDeadlineOffsetMs(anchor);
  return new Date(anchor.getTime() - offset);
}

export const updateOutingSchema = z
  .object({
    shortId: shortIdSchema,
    title: trimmedString.min(1).max(200),
    venue: trimmedString
      .max(200)
      .optional()
      .or(z.literal(""))
      .transform((v) => v || undefined),
    startsAt: z.coerce.date(),
    rsvpDeadline: z.coerce.date(),
    ticketUrl: optionalSafeUrl,
  })
  .refine((data) => data.rsvpDeadline < data.startsAt, {
    message: "La deadline doit être avant la date de la sortie.",
    path: ["rsvpDeadline"],
  });

export const rsvpSchema = z.object({
  shortId: shortIdSchema,
  displayName: trimmedString.min(1).max(100),
  response: z.enum(["yes", "no", "handle_own"]),
  extraAdults: z.coerce.number().int().min(0).max(10).default(0),
  extraChildren: z.coerce.number().int().min(0).max(10).default(0),
  email: z
    .union([z.literal(""), z.string().email().max(255)])
    .optional()
    .transform((v) => v || undefined),
});

// Vote-mode RSVP — participant ships availability per timeslot instead of a
// single yes/no. We derive their `response` server-side: at least one
// "available" → "interested", else "no". The final yes/no flip happens when
// the creator picks a winning timeslot.
export const voteRsvpSchema = z.object({
  shortId: shortIdSchema,
  displayName: trimmedString.min(1).max(100),
  email: z
    .union([z.literal(""), z.string().email().max(255)])
    .optional()
    .transform((v) => v || undefined),
  votes: z.preprocess((raw) => {
    if (typeof raw !== "string" || raw.length === 0) {
      return undefined;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }, z.array(timeslotVoteInputSchema).min(0).max(8).default([])),
});

export const pickTimeslotSchema = z.object({
  shortId: shortIdSchema,
  timeslotId: z.string().uuid(),
});

export const cancelOutingSchema = z.object({
  shortId: shortIdSchema,
});
