"use server";

import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { sanitizeStrictText, sanitizeText } from "@/lib/sanitize";
import { outings, outingTimeslots, participants, timeslotVotes } from "@drizzle/sortie-schema";
import { generateUniqueShortId, slugifyAscii } from "@/features/sortie/lib/short-id";
import { ensureParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import {
  buildOutingDiff,
  sendOutingCancelledEmails,
  sendOutingModifiedEmails,
  sendTimeslotPickedEmails,
} from "@/features/sortie/lib/emails/send-outing-emails";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { getClientIp, rateLimit } from "@/features/sortie/lib/rate-limit";
import {
  archiveOutingSchema,
  cancelOutingSchema,
  createOutingSchema,
  pickTimeslotSchema,
  resolveDeadline,
  unarchiveOutingSchema,
  updateOutingSchema,
} from "./schemas";

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

  const ip = await getClientIp();
  const gate = await rateLimit({ key: `create:${ip}`, limit: 5, windowSeconds: 900 });
  if (!gate.ok) {
    return { message: gate.message };
  }

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

  // In vote mode we defer the concrete datetime: the outing is created with
  // fixedDatetime = null until the creator picks a winning timeslot. The
  // deadline is still required (it closes voting) so participants know when
  // they must have voted by.
  const [insertedOuting] = await db
    .insert(outings)
    .values({
      shortId,
      slug,
      title,
      location: venue,
      eventLink: data.ticketUrl ?? null,
      heroImageUrl: data.heroImageUrl ?? null,
      vibe: data.vibe ?? null,
      fixedDatetime: data.mode === "fixed" ? (data.startsAt ?? null) : null,
      deadlineAt: resolveDeadline({
        rsvpDeadline: data.rsvpDeadline,
        mode: data.mode,
        startsAt: data.startsAt,
        timeslots: data.timeslots,
      }),
      mode: data.mode,
      status: "open",
      showOnProfile: data.showOnProfile,
      creatorUserId: user?.id ?? null,
      creatorAnonName: user ? null : creatorDisplayName,
      creatorAnonEmail: user ? null : (data.creatorEmail ?? null),
      creatorCookieTokenHash: user ? null : cookieTokenHash,
    })
    .returning({ id: outings.id });

  if (data.mode === "vote" && data.timeslots) {
    await db.insert(outingTimeslots).values(
      data.timeslots.map((t, idx) => ({
        outingId: insertedOuting.id,
        startsAt: t.startsAt,
        position: t.position ?? idx,
      }))
    );
  }

  // Auto-RSVP the creator as "yes" (only in fixed mode — in vote mode we
  // don't know which slots they can make yet). Without this, the outing
  // page shows an empty participant list right after create, which reads
  // as "did this even work?" to first-time users. They can always change
  // their mind via the RSVP sheet — the cookieTokenHash match means it
  // updates their existing row instead of creating a second one.
  if (data.mode === "fixed") {
    await db.insert(participants).values({
      outingId: insertedOuting.id,
      userId: user?.id ?? null,
      anonName: user ? null : creatorDisplayName,
      anonEmail: user ? null : (data.creatorEmail ?? null),
      cookieTokenHash,
      response: "yes",
    });
  }

  // User-facing URLs on sortie.colist.fr are / -prefixed — the /sortie internal
  // prefix only exists after proxy.ts rewrites. Redirecting to /sortie/… would
  // send the browser to sortie.colist.fr/sortie/<id>, rewritten again to
  // /sortie/sortie/<id>, which doesn't exist → 404.
  const path = `/${canonicalPathSegment({ slug, shortId })}`;
  revalidatePath(path);
  // `?from=create` triggers the "preview-as-success" banner on the outing
  // page — same destination as the public view, but with a contextual
  // "share this now" affordance overlaid so the creator doesn't have to
  // wonder whether their sortie went through.
  redirect(`${path}?from=create`);
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

  const actorKey = user ? `user:${user.id}` : `cookie:${cookieTokenHash}`;
  const gate = await rateLimit({ key: `update:${actorKey}`, limit: 20, windowSeconds: 3600 });
  if (!gate.ok) {
    return { message: gate.message };
  }

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
  const ticketUrl = data.ticketUrl ?? null;

  await db
    .update(outings)
    .set({
      title,
      location: venue,
      eventLink: ticketUrl,
      fixedDatetime: data.startsAt,
      deadlineAt: data.rsvpDeadline,
      slug,
      updatedAt: new Date(),
    })
    .where(eq(outings.id, outing.id));

  const diff = buildOutingDiff(
    {
      title: outing.title,
      location: outing.location,
      fixedDatetime: outing.fixedDatetime,
      deadlineAt: outing.deadlineAt,
      eventLink: outing.eventLink,
    },
    {
      title,
      location: venue,
      fixedDatetime: data.startsAt,
      deadlineAt: data.rsvpDeadline,
      eventLink: ticketUrl,
    }
  );
  if (diff.length > 0) {
    await sendOutingModifiedEmails({
      outing: {
        id: outing.id,
        title,
        slug,
        shortId: outing.shortId,
      },
      diff,
    });
  }

  const path = `/${canonicalPathSegment({ slug, shortId: data.shortId })}`;
  revalidatePath(path);
  redirect(path);
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
  const cookieTokenHash = await ensureParticipantTokenHash();

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  const isOwner =
    (user && outing.creatorUserId === user.id) ||
    (outing.creatorCookieTokenHash !== null && outing.creatorCookieTokenHash === cookieTokenHash);
  if (!isOwner) {
    return { message: "Tu n'as pas les droits pour annuler cette sortie." };
  }

  if (outing.status === "cancelled") {
    // Idempotent: already cancelled, just redirect back.
    const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
    redirect(`/${canonical}`);
  }

  await db
    .update(outings)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(eq(outings.id, outing.id));

  await sendOutingCancelledEmails({
    outing: { id: outing.id, title: outing.title },
  });

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}`);
  redirect(`/${canonical}`);
}

/**
 * Soft-archive — hides the outing from the creator's profile lists
 * without cancelling it. No email is sent, attendees still see the
 * outing at its canonical URL, and the creator can un-archive from
 * their "Archivées" tab. Distinct from `cancelOutingAction`, which
 * flips status + emails everyone.
 *
 * Returns `{ ok: true }` instead of redirecting so the caller (swipe
 * card with undo toast) can render an optimistic update + allow
 * reverting within 5s without a page reload.
 */
export async function archiveOutingAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = archiveOutingSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { shortId } = parsed.data;
  const user = await getSessionUser();
  const cookieTokenHash = await ensureParticipantTokenHash();

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  const isOwner =
    (user && outing.creatorUserId === user.id) ||
    (outing.creatorCookieTokenHash !== null && outing.creatorCookieTokenHash === cookieTokenHash);
  if (!isOwner) {
    return { message: "Tu n'as pas les droits pour archiver cette sortie." };
  }

  // Idempotent — already archived.
  if (outing.hiddenFromProfileAt) {
    revalidatePath("/moi");
    return {};
  }

  await db
    .update(outings)
    .set({ hiddenFromProfileAt: new Date(), updatedAt: new Date() })
    .where(eq(outings.id, outing.id));

  revalidatePath("/moi");
  return {};
}

export async function unarchiveOutingAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = unarchiveOutingSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { shortId } = parsed.data;
  const user = await getSessionUser();
  const cookieTokenHash = await ensureParticipantTokenHash();

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  const isOwner =
    (user && outing.creatorUserId === user.id) ||
    (outing.creatorCookieTokenHash !== null && outing.creatorCookieTokenHash === cookieTokenHash);
  if (!isOwner) {
    return { message: "Tu n'as pas les droits." };
  }

  if (!outing.hiddenFromProfileAt) {
    return {};
  }

  await db
    .update(outings)
    .set({ hiddenFromProfileAt: null, updatedAt: new Date() })
    .where(eq(outings.id, outing.id));

  revalidatePath("/moi");
  return {};
}

/**
 * Creator-only action that fixes the date of a vote-mode outing. Flips each
 * participant's `response` based on their vote for the chosen timeslot:
 *   - voted available=true  → response="yes"
 *   - voted available=false → response="no"
 *   - didn't vote on this slot → response stays "interested" (they must
 *     re-RSVP explicitly via the normal sheet once mode is de facto fixed).
 *
 * The outing keeps mode="vote" so the UI can keep showing the tally, but
 * `chosenTimeslotId` + `fixedDatetime` are set so every other place that
 * cares about "when is it" works as if it were a fixed outing.
 */
export async function pickTimeslotAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = pickTimeslotSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { shortId, timeslotId } = parsed.data;
  const user = await getSessionUser();
  const cookieTokenHash = await ensureParticipantTokenHash();

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  const isOwner =
    (user && outing.creatorUserId === user.id) ||
    (outing.creatorCookieTokenHash !== null && outing.creatorCookieTokenHash === cookieTokenHash);
  if (!isOwner) {
    return { message: "Tu n'as pas les droits pour choisir la date." };
  }
  if (outing.mode !== "vote") {
    return { message: "Cette sortie n'est pas en mode sondage." };
  }
  if (outing.chosenTimeslotId) {
    return { message: "Un créneau a déjà été choisi." };
  }
  if (outing.status === "cancelled") {
    return { message: "Cette sortie est annulée." };
  }

  const timeslot = await db.query.outingTimeslots.findFirst({
    where: and(eq(outingTimeslots.id, timeslotId), eq(outingTimeslots.outingId, outing.id)),
  });
  if (!timeslot) {
    return { message: "Créneau introuvable." };
  }

  // Pull every participant for this outing + their vote on the chosen slot
  // (if any) in one round-trip so we can compute response flips without N+1.
  const rows = await db
    .select({
      participantId: participants.id,
      currentResponse: participants.response,
      voted: timeslotVotes.available,
    })
    .from(participants)
    .leftJoin(
      timeslotVotes,
      and(
        eq(timeslotVotes.participantId, participants.id),
        eq(timeslotVotes.timeslotId, timeslotId)
      )
    )
    .where(eq(participants.outingId, outing.id));

  const toYes: string[] = [];
  const toNo: string[] = [];
  for (const row of rows) {
    if (row.voted === true && row.currentResponse !== "yes") {
      toYes.push(row.participantId);
    } else if (row.voted === false && row.currentResponse !== "no") {
      toNo.push(row.participantId);
    }
    // voted === null (didn't vote on this slot) → keep current response.
  }

  await db
    .update(outings)
    .set({
      fixedDatetime: timeslot.startsAt,
      chosenTimeslotId: timeslot.id,
      updatedAt: new Date(),
    })
    .where(eq(outings.id, outing.id));

  if (toYes.length > 0) {
    await db
      .update(participants)
      .set({ response: "yes", updatedAt: new Date() })
      .where(inArray(participants.id, toYes));
  }
  if (toNo.length > 0) {
    await db
      .update(participants)
      .set({ response: "no", updatedAt: new Date() })
      .where(inArray(participants.id, toNo));
  }

  await sendTimeslotPickedEmails({
    outing: {
      id: outing.id,
      title: outing.title,
      slug: outing.slug,
      shortId: outing.shortId,
      location: outing.location,
      fixedDatetime: timeslot.startsAt,
    },
  });

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}`);
  redirect(`/${canonical}`);
}
