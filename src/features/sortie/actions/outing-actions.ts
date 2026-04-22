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
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { createOutingSchema, updateOutingSchema } from "./schemas";

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
  // Creator's device cookie hash — lets anon creators edit their own outing
  // from the same browser, and is the target a magic-link reclaim flips when
  // the creator switches device.
  const cookieTokenHash = await ensureParticipantTokenHash();

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
    creatorCookieTokenHash: user ? null : cookieTokenHash,
  });

  // We tagged the creator's device with the same cookie hash that will be used
  // by the participant row at RSVP time — but we don't create a participant
  // here. The creator is not automatically "yes"; they RSVP like anyone else.

  // User-facing URLs on sortie.colist.fr are / -prefixed — the /sortie internal
  // prefix only exists after proxy.ts rewrites. Redirecting to /sortie/… would
  // send the browser to sortie.colist.fr/sortie/<id>, rewritten again to
  // /sortie/sortie/<id>, which doesn't exist → 404.
  const path = `/${canonicalPathSegment({ slug, shortId })}`;
  revalidatePath(path);
  redirect(path);
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
  const cookieTokenHash = await ensureParticipantTokenHash();

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, data.shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  const isOwner =
    (user && outing.creatorUserId === user.id) ||
    (outing.creatorCookieTokenHash !== null && outing.creatorCookieTokenHash === cookieTokenHash);
  if (!isOwner) {
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

  const path = `/${canonicalPathSegment({ slug, shortId: data.shortId })}`;
  revalidatePath(path);
  redirect(path);
}
