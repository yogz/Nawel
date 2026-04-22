"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { sanitizeStrictText, sanitizeText } from "@/lib/sanitize";
import { outings } from "@drizzle/sortie-schema";
import { generateUniqueShortId, slugifyAscii } from "@/features/sortie/lib/short-id";
import { ensureParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { cancelOutingSchema, createOutingSchema, updateOutingSchema } from "./schemas";

export type FormActionState = {
  errors?: Record<string, string[]>;
  message?: string;
};

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    obj[key] = typeof value === "string" ? value : "";
  }
  // Checkbox inputs post "on" or are absent — treat presence as true.
  if (formData.has("showOnProfile")) {
    obj.showOnProfile = true;
  }
  return obj;
}

export async function createOutingAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = createOutingSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const user = await getSessionUser();
  // Side-effect only: tag the creator's device so they can RSVP "yes" later
  // and so the Phase 4 magic-link reclaim flow has an anchor.
  await ensureParticipantTokenHash();

  const shortId = await generateUniqueShortId();
  const title = sanitizeText(data.title, 200);
  const venue = data.venue ? sanitizeText(data.venue, 200) : null;
  const slug = slugifyAscii(title, 40);
  const creatorDisplayName = user
    ? (user.name ?? "").slice(0, 100)
    : sanitizeStrictText(data.creatorDisplayName, 100);

  await db.insert(outings).values({
    shortId,
    slug,
    title,
    location: venue,
    eventLink: data.ticketUrl ?? null,
    fixedDatetime: data.startsAt,
    deadlineAt: data.rsvpDeadline,
    mode: "fixed",
    status: "open",
    showOnProfile: data.showOnProfile,
    creatorUserId: user?.id ?? null,
    creatorAnonName: user ? null : creatorDisplayName,
    creatorAnonEmail: user ? null : (data.creatorEmail ?? null),
  });

  // We tagged the creator's device with the same cookie hash that will be used
  // by the participant row at RSVP time — but we don't create a participant
  // here. The creator is not automatically "yes"; they RSVP like anyone else.

  revalidatePath(`/sortie/${shortId}`);
  redirect(`/sortie/${shortId}`);
}

export async function updateOutingAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = updateOutingSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const user = await getSessionUser();

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, data.shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  // Authorization: logged-in creator only in Phase 2. Anonymous creators
  // must reclaim via magic link (Phase 4) before they can edit.
  if (!user || outing.creatorUserId !== user.id) {
    return { message: "Tu n'as pas les droits pour modifier cette sortie." };
  }

  const title = sanitizeText(data.title, 200);
  const venue = data.venue ? sanitizeText(data.venue, 200) : null;
  const slug = slugifyAscii(title, 40);

  await db
    .update(outings)
    .set({
      title,
      location: venue,
      eventLink: data.ticketUrl ?? null,
      fixedDatetime: data.startsAt,
      deadlineAt: data.rsvpDeadline,
      slug,
      updatedAt: new Date(),
    })
    .where(eq(outings.id, outing.id));

  revalidatePath(`/sortie/${data.shortId}`);
  redirect(`/sortie/${data.shortId}`);
}

export async function cancelOutingAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = cancelOutingSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { shortId } = parsed.data;
  const user = await getSessionUser();
  const outing = await db.query.outings.findFirst({ where: eq(outings.shortId, shortId) });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }
  if (!user || outing.creatorUserId !== user.id) {
    return { message: "Tu n'as pas les droits pour annuler cette sortie." };
  }
  await db
    .update(outings)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(eq(outings.id, outing.id));
  revalidatePath(`/sortie/${shortId}`);
  return {};
}
