"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { sanitizeStrictText } from "@/lib/sanitize";
import { outings, outingTimeslots, participants, timeslotVotes } from "@drizzle/sortie-schema";
import { ensureParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { sendRsvpReceivedEmail } from "@/features/sortie/lib/emails/send-outing-emails";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { rsvpSchema, voteRsvpSchema } from "./schemas";
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

  const gate = await rateLimit({
    key: `rsvp:${cookieTokenHash}`,
    limit: 20,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

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

  // Notify the organizer (fire-and-forget; the helper catches its own errors
  // so Resend downtime never rolls back the RSVP).
  await sendRsvpReceivedEmail({
    outing: {
      title: outing.title,
      slug: outing.slug,
      shortId: outing.shortId,
      creatorUserId: outing.creatorUserId,
      creatorAnonEmail: outing.creatorAnonEmail,
      creatorCookieTokenHash: outing.creatorCookieTokenHash,
    },
    responder: {
      participantId: existing?.id ?? "",
      cookieTokenHash,
      userId: user?.id ?? null,
      anonName: user ? null : displayName,
      userName: user?.name ?? null,
    },
    response: data.response,
    extraAdults: data.response === "yes" ? data.extraAdults : 0,
    extraChildren: data.response === "yes" ? data.extraChildren : 0,
  });

  // Revalidate the bare-shortId form; the public page's canonical redirect
  // takes care of both the /<shortId> and /<slug-shortId> cache entries.
  revalidatePath(`/${data.shortId}`);
  return {};
}

/**
 * RSVP for vote-mode outings. The participant ships availability per
 * timeslot instead of a single yes/no — we derive their `response` from
 * the array: any "available" → "interested" (they're in the running), all
 * "not available" → "no" (explicit out).
 *
 * When the creator later picks a winning timeslot, `pickTimeslotAction`
 * walks these votes and flips each participant to yes/no based on their
 * availability on the chosen slot.
 */
export async function castVoteAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = voteRsvpSchema.safeParse(formDataToRsvp(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const user = await getSessionUser();
  const cookieTokenHash = await ensureParticipantTokenHash();

  const gate = await rateLimit({
    key: `rsvp:${cookieTokenHash}`,
    limit: 20,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, data.shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }
  if (outing.status === "cancelled") {
    return { message: "Cette sortie est annulée." };
  }
  if (outing.mode !== "vote") {
    return { message: "Cette sortie n'est pas en mode sondage." };
  }
  if (outing.chosenTimeslotId) {
    return { message: "Le créneau a déjà été choisi. Réponds plutôt oui/non." };
  }
  if (outing.deadlineAt < new Date()) {
    return { message: "Les votes sont clos pour cette sortie." };
  }

  // Only accept votes for timeslots that actually belong to this outing —
  // a hostile form could otherwise ship vote rows for another outing's slot.
  const validSlots = await db
    .select({ id: outingTimeslots.id })
    .from(outingTimeslots)
    .where(eq(outingTimeslots.outingId, outing.id));
  const validIds = new Set(validSlots.map((s) => s.id));
  const filtered = data.votes.filter((v) => validIds.has(v.timeslotId));

  const displayName = user
    ? (user.name ?? "").slice(0, 100) || sanitizeStrictText(data.displayName, 100)
    : sanitizeStrictText(data.displayName, 100);

  // Simplified vote UX: selecting at least one slot = interested, selecting
  // nothing = "I can't make any" (response "no"). No more "Pas dispo"
  // toggle — unvoted = implicit no, which keeps the matrix at one tap per
  // slot instead of two.
  const response: "interested" | "no" =
    filtered.length > 0 && filtered.some((v) => v.available) ? "interested" : "no";

  const existing = await db.query.participants.findFirst({
    where: and(
      eq(participants.outingId, outing.id),
      eq(participants.cookieTokenHash, cookieTokenHash)
    ),
  });

  let participantId: string;
  if (existing) {
    await db
      .update(participants)
      .set({
        response,
        anonName: user ? null : displayName,
        anonEmail: user ? null : (data.email ?? null),
        userId: user?.id ?? existing.userId,
        updatedAt: new Date(),
      })
      .where(eq(participants.id, existing.id));
    participantId = existing.id;
  } else {
    const [row] = await db
      .insert(participants)
      .values({
        outingId: outing.id,
        userId: user?.id ?? null,
        anonName: user ? null : displayName,
        anonEmail: user ? null : (data.email ?? null),
        cookieTokenHash,
        response,
      })
      .returning({ id: participants.id });
    participantId = row.id;
  }

  // Wipe-and-rewrite is fine here — composite PK on (participantId, timeslotId)
  // means we can't UPSERT-with-conflict cheaply, and a handful of rows per
  // participant keeps the write cost negligible.
  await db.delete(timeslotVotes).where(eq(timeslotVotes.participantId, participantId));
  if (filtered.length > 0) {
    await db.insert(timeslotVotes).values(
      filtered.map((v) => ({
        participantId,
        timeslotId: v.timeslotId,
        available: v.available,
      }))
    );
  }

  revalidatePath(`/${data.shortId}`);
  return {};
}
