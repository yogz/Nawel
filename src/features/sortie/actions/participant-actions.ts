"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { sanitizeStrictText } from "@/lib/sanitize";
import { outings, participants } from "@drizzle/sortie-schema";
import { ensureParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { rsvpSchema } from "./schemas";
import type { FormActionState } from "./outing-actions";

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

function formDataToRsvp(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    obj[key] = typeof value === "string" ? value : "";
  }
  return obj;
}

export async function rsvpAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = rsvpSchema.safeParse(formDataToRsvp(formData));
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
  if (outing.status === "cancelled") {
    return { message: "Cette sortie est annulée." };
  }
  // After the RSVP deadline the list is frozen — Phase 3 will allow
  // late "interested" responses, not here.
  if (outing.deadlineAt < new Date() && outing.status !== "open") {
    return { message: "Les réponses sont closes pour cette sortie." };
  }

  const displayName = user
    ? (user.name ?? "").slice(0, 100) || sanitizeStrictText(data.displayName, 100)
    : sanitizeStrictText(data.displayName, 100);

  const existing = await db.query.participants.findFirst({
    where: and(
      eq(participants.outingId, outing.id),
      eq(participants.cookieTokenHash, cookieTokenHash)
    ),
  });

  if (existing) {
    await db
      .update(participants)
      .set({
        response: data.response,
        extraAdults: data.response === "yes" ? data.extraAdults : 0,
        extraChildren: data.response === "yes" ? data.extraChildren : 0,
        anonName: user ? null : displayName,
        anonEmail: user ? null : (data.email ?? null),
        userId: user?.id ?? existing.userId,
        updatedAt: new Date(),
      })
      .where(eq(participants.id, existing.id));
  } else {
    await db.insert(participants).values({
      outingId: outing.id,
      userId: user?.id ?? null,
      anonName: user ? null : displayName,
      anonEmail: user ? null : (data.email ?? null),
      cookieTokenHash,
      response: data.response,
      extraAdults: data.response === "yes" ? data.extraAdults : 0,
      extraChildren: data.response === "yes" ? data.extraChildren : 0,
    });
  }

  revalidatePath(`/sortie/${data.shortId}`);
  return {};
}
