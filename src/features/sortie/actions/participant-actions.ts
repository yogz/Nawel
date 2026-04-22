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

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function rsvpAction(input: unknown) {
  const data = rsvpSchema.parse(input);
  const user = await getSessionUser();
  const cookieTokenHash = await ensureParticipantTokenHash();

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, data.shortId),
  });
  if (!outing) {
    throw new Error("Sortie introuvable.");
  }
  if (outing.status === "cancelled") {
    throw new Error("Cette sortie est annulée.");
  }
  // After the RSVP deadline the list is frozen — Phase 3 will allow
  // late "interested" responses, not here.
  if (outing.deadlineAt < new Date() && outing.status !== "open") {
    throw new Error("Les réponses sont closes pour cette sortie.");
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
}
