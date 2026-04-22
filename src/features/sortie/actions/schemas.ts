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

const optionalSafeUrl = z.union([z.literal(""), safeHttpUrl]).transform((v) => v || undefined);

export const createOutingSchema = z
  .object({
    title: trimmedString.min(1).max(200),
    venue: trimmedString
      .max(200)
      .optional()
      .or(z.literal(""))
      .transform((v) => v || undefined),
    startsAt: z.coerce.date(),
    rsvpDeadline: z.coerce.date(),
    ticketUrl: optionalSafeUrl,
    creatorDisplayName: trimmedString.min(1).max(100),
    creatorEmail: z
      .union([z.literal(""), z.string().email().max(255)])
      .transform((v) => v || undefined),
    showOnProfile: z.boolean().default(true),
  })
  .refine((data) => data.rsvpDeadline < data.startsAt, {
    message: "La deadline doit être avant la date de la sortie.",
    path: ["rsvpDeadline"],
  });

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
  email: z.union([z.literal(""), z.string().email().max(255)]).transform((v) => v || undefined),
});
