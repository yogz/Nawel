import { z } from "zod";

const trimmedString = z.string().trim();

const shortIdSchema = z
  .string()
  .trim()
  .regex(/^[23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);

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
    ticketUrl: z
      .union([z.literal(""), z.string().url().max(2048)])
      .transform((v) => v || undefined),
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

export type CreateOutingInput = z.infer<typeof createOutingSchema>;

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
    ticketUrl: z
      .union([z.literal(""), z.string().url().max(2048)])
      .transform((v) => v || undefined),
  })
  .refine((data) => data.rsvpDeadline < data.startsAt, {
    message: "La deadline doit être avant la date de la sortie.",
    path: ["rsvpDeadline"],
  });

export type UpdateOutingInput = z.infer<typeof updateOutingSchema>;

export const rsvpSchema = z.object({
  shortId: shortIdSchema,
  displayName: trimmedString.min(1).max(100),
  response: z.enum(["yes", "no", "handle_own"]),
  extraAdults: z.coerce.number().int().min(0).max(10).default(0),
  extraChildren: z.coerce.number().int().min(0).max(10).default(0),
  email: z.union([z.literal(""), z.string().email().max(255)]).transform((v) => v || undefined),
});

export type RsvpInput = z.infer<typeof rsvpSchema>;

export const claimIdentitySchema = z.object({
  shortId: shortIdSchema,
  participantId: z.string().uuid(),
});

export type ClaimIdentityInput = z.infer<typeof claimIdentitySchema>;

export const cancelOutingSchema = z.object({
  shortId: shortIdSchema,
});
