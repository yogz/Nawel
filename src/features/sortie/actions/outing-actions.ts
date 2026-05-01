"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
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
import {
  deletePreviousEventImage,
  generateOgThumbnailFromRemoteUrl,
} from "@/features/sortie/lib/event-image-upload";
import { getClientIp, rateLimit } from "@/features/sortie/lib/rate-limit";
import { ensureSilentUserAccount } from "@/features/sortie/lib/silent-user";
import { formDataToObject } from "@/features/sortie/lib/form-data";
import { isOutingOwner } from "@/features/sortie/lib/owner";
import {
  archiveOutingSchema,
  cancelOutingSchema,
  createOutingSchema,
  pickTimeslotSchema,
  reopenPollSchema,
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

// HTML checkbox inputs sont absents (false) ou postent "on" (true). On
// transforme en boolean après le helper plat pour que Zod parse `true`
// plutôt qu'une string ambiguë.
function withCheckbox(obj: Record<string, unknown>, formData: FormData, key: string) {
  if (formData.has(key)) {
    obj[key] = true;
  }
  return obj;
}

export async function createOutingAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = createOutingSchema.safeParse(
    withCheckbox(formDataToObject(formData), formData, "showOnProfile")
  );
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

  // When the hero comes from a parsed ticket page (a third-party CDN URL
  // rather than our blob), the upload pipeline never ran and we have no
  // OG thumbnail yet. Generate one inline so the eventual WhatsApp
  // preview stays under the ~300 KB cliff. Best-effort — `null` falls
  // back on the raw remote URL at OG render time.
  const heroImageUrl = data.heroImageUrl ?? null;
  let heroImageOgUrl = data.heroImageOgUrl ?? null;
  if (heroImageUrl && !heroImageOgUrl) {
    heroImageOgUrl = await generateOgThumbnailFromRemoteUrl(heroImageUrl);
  }

  // Création silencieuse d'un compte si le créateur anon a fourni son
  // email : au prochain magic-link signin, il retrouvera la sortie
  // sous son compte sans passer par le ReclaimForm. Si le compte
  // existe déjà avec cet email, on le rattache directement.
  const silentCreatorUserId =
    !user && data.creatorEmail
      ? await ensureSilentUserAccount({
          email: data.creatorEmail,
          name: creatorDisplayName,
        })
      : null;
  const effectiveCreatorUserId = user?.id ?? silentCreatorUserId;

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
      heroImageUrl,
      heroImageOgUrl,
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
      creatorUserId: effectiveCreatorUserId,
      // Quand un userId (logué ou silent) est rattaché, on n'écrit
      // pas dans les colonnes anon — l'identité vit dans la table
      // user, plus dans deux colonnes en parallèle.
      creatorAnonName: effectiveCreatorUserId ? null : creatorDisplayName,
      creatorAnonEmail: effectiveCreatorUserId ? null : (data.creatorEmail ?? null),
      // Le cookie reste utile même avec un user silent : il permet
      // au créateur de réouvrir la sortie depuis le même device tant
      // qu'il n'a pas signé le magic link.
      creatorCookieTokenHash: effectiveCreatorUserId && user ? null : cookieTokenHash,
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
      userId: effectiveCreatorUserId,
      anonName: effectiveCreatorUserId ? null : creatorDisplayName,
      anonEmail: effectiveCreatorUserId ? null : (data.creatorEmail ?? null),
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
  revalidatePath("/agenda");
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
  const parsed = updateOutingSchema.safeParse(
    withCheckbox(formDataToObject(formData), formData, "showOnProfile")
  );
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

  const isOwner = isOutingOwner(outing, { userId: user?.id, cookieTokenHash });
  if (!isOwner) {
    return { message: "Tu n'as pas les droits pour modifier cette sortie." };
  }

  const title = sanitizeText(data.title, 200);
  const venue = data.venue ? sanitizeText(data.venue, 200) : null;
  const slug = slugifyAscii(title, 40);
  const ticketUrl = data.ticketUrl ?? null;
  const heroImageUrl = data.heroImageUrl ?? null;
  // If the user replaced the hero image, the OG companion changed
  // alongside it; if they wiped the hero, the companion goes too.
  // Otherwise we keep what was already in DB (the form may not always
  // re-submit `heroImageOgUrl` on a no-op edit).
  let heroImageOgUrl: string | null;
  if (heroImageUrl === null) {
    heroImageOgUrl = null;
  } else if (heroImageUrl !== outing.heroImageUrl) {
    // New image. The wizard's upload path submits the companion next to
    // the original; a hand-pasted URL or re-parsed ticket page does
    // not — generate one inline as a fallback.
    heroImageOgUrl = data.heroImageOgUrl ?? null;
    if (!heroImageOgUrl) {
      heroImageOgUrl = await generateOgThumbnailFromRemoteUrl(heroImageUrl);
    }
  } else {
    heroImageOgUrl = outing.heroImageOgUrl;
  }

  // `fixedDatetime` n'est mis à jour que si l'utilisateur a fourni
  // une date (form mode fixed ou mode vote post-pick). En mode vote
  // sans créneau choisi, le DateField startsAt est masqué côté UI ;
  // on garde donc la valeur null actuelle plutôt que d'écraser à
  // undefined / NULL.
  await db
    .update(outings)
    .set({
      title,
      location: venue,
      eventLink: ticketUrl,
      heroImageUrl,
      heroImageOgUrl,
      ...(data.startsAt ? { fixedDatetime: data.startsAt } : {}),
      deadlineAt: data.rsvpDeadline,
      slug,
      updatedAt: new Date(),
      // Bump SEQUENCE : un changement de titre / date / lieu doit forcer
      // les clients calendar à re-rendre l'event (RFC 5545 §3.8.7.4).
      sequence: sql`${outings.sequence} + 1`,
    })
    .where(eq(outings.id, outing.id));

  // Best-effort cleanup of the blobs we just orphaned. Fire-and-forget
  // — don't block the redirect on a Vercel Blob round-trip, and don't
  // throw on failure (an orphaned blob is cheap, a failed update would
  // be a user-facing regression).
  if (outing.heroImageUrl !== heroImageUrl || outing.heroImageOgUrl !== heroImageOgUrl) {
    const staleUrl = outing.heroImageUrl !== heroImageUrl ? outing.heroImageUrl : null;
    const staleOgUrl = outing.heroImageOgUrl !== heroImageOgUrl ? outing.heroImageOgUrl : null;
    void deletePreviousEventImage(staleUrl, staleOgUrl);
  }

  const diff = buildOutingDiff(
    {
      title: outing.title,
      location: outing.location,
      fixedDatetime: outing.fixedDatetime,
      deadlineAt: outing.deadlineAt,
      eventLink: outing.eventLink,
      heroImageUrl: outing.heroImageUrl,
    },
    {
      title,
      location: venue,
      // Quand startsAt n'est pas fourni (mode vote), on passe la
      // valeur DB existante au diff pour qu'aucun email "date
      // modifiée" parte alors qu'on n'y a pas touché.
      fixedDatetime: data.startsAt ?? outing.fixedDatetime,
      deadlineAt: data.rsvpDeadline,
      eventLink: ticketUrl,
      heroImageUrl,
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
  revalidatePath("/agenda");
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

  const isOwner = isOutingOwner(outing, { userId: user?.id, cookieTokenHash });
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
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      updatedAt: new Date(),
      // Bump SEQUENCE pour que les clients calendar abonnés au flux iCal
      // re-rendent la copie locale (Apple/Outlook ignorent les updates
      // sans SEQUENCE incrémenté). Cf. RFC 5545 §3.8.7.4.
      sequence: sql`${outings.sequence} + 1`,
    })
    .where(eq(outings.id, outing.id));

  await sendOutingCancelledEmails({
    outing: { id: outing.id, title: outing.title },
  });

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}`);
  revalidatePath("/agenda");
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

  const isOwner = isOutingOwner(outing, { userId: user?.id, cookieTokenHash });
  if (!isOwner) {
    return { message: "Tu n'as pas les droits pour archiver cette sortie." };
  }

  // Idempotent — already archived.
  if (outing.hiddenFromProfileAt) {
    revalidatePath("/moi");
    revalidatePath("/agenda");
    return {};
  }

  await db
    .update(outings)
    .set({ hiddenFromProfileAt: new Date(), updatedAt: new Date() })
    .where(eq(outings.id, outing.id));

  revalidatePath("/moi");
  revalidatePath("/agenda");
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

  const isOwner = isOutingOwner(outing, { userId: user?.id, cookieTokenHash });
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
  revalidatePath("/agenda");
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

  const isOwner = isOutingOwner(outing, { userId: user?.id, cookieTokenHash });
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

  // Refuser de figer un sondage qui n'a aucun vote — sinon le créateur
  // bloque l'UI de vote pour les invités sans avoir reçu un seul retour
  // (voir l'incident dMekC3qK : la VoteRsvpSheet disparaît dès que
  // chosen_timeslot_id est non-null, plus moyen de revoter).
  const totalVotes = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(timeslotVotes)
    .innerJoin(outingTimeslots, eq(outingTimeslots.id, timeslotVotes.timeslotId))
    .where(eq(outingTimeslots.outingId, outing.id))
    .then((rows) => rows[0]?.n ?? 0);
  if (totalVotes === 0) {
    return { message: "Personne n'a encore voté — partage le lien d'abord." };
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

  // Transaction : pick + flips de réponses doivent être atomiques. Sans
  // ça, un crash après l'update outing mais avant les updates participants
  // laisserait la sortie figée sur un créneau alors que les yes/no ne
  // reflètent pas encore le vote — l'UI montrerait un mauvais headcount.
  // Email reste hors transaction (Resend fire-and-forget).
  await db.transaction(async (tx) => {
    await tx
      .update(outings)
      .set({
        fixedDatetime: timeslot.startsAt,
        chosenTimeslotId: timeslot.id,
        updatedAt: new Date(),
      })
      .where(eq(outings.id, outing.id));

    if (toYes.length > 0) {
      await tx
        .update(participants)
        .set({ response: "yes", updatedAt: new Date() })
        .where(inArray(participants.id, toYes));
    }
    if (toNo.length > 0) {
      await tx
        .update(participants)
        .set({ response: "no", updatedAt: new Date() })
        .where(inArray(participants.id, toNo));
    }
  });

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
  revalidatePath("/agenda");
  redirect(`/${canonical}`);
}

/**
 * Rouvrir un sondage qui a été figé prématurément. Reset
 * `chosen_timeslot_id` + `fixed_datetime` à NULL — la `VoteRsvpSheet`
 * réapparaît, les invités peuvent (re)voter, et le créateur peut
 * re-pick une fois qu'il y a des votes. Les `participants.response`
 * existants sont conservés tels quels (le pick suivant les recalcule
 * à partir des votes par créneau).
 */
export async function reopenPollAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = reopenPollSchema.safeParse(formDataToObject(formData));
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

  const isOwner = isOutingOwner(outing, { userId: user?.id, cookieTokenHash });
  if (!isOwner) {
    return { message: "Tu n'as pas les droits pour rouvrir le sondage." };
  }
  if (outing.mode !== "vote") {
    return { message: "Cette sortie n'est pas en mode sondage." };
  }
  if (!outing.chosenTimeslotId) {
    return { message: "Le sondage est déjà ouvert." };
  }
  if (outing.status === "cancelled") {
    return { message: "Cette sortie est annulée." };
  }

  await db
    .update(outings)
    .set({
      chosenTimeslotId: null,
      fixedDatetime: null,
      updatedAt: new Date(),
    })
    .where(eq(outings.id, outing.id));

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  revalidatePath(`/${canonical}`);
  revalidatePath("/agenda");
  return {};
}
