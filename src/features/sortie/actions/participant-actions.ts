"use server";

import { and, eq, or } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { sanitizeStrictText } from "@/lib/sanitize";
import { outings, outingTimeslots, participants, timeslotVotes } from "@drizzle/sortie-schema";
import {
  ensureParticipantTokenHash,
  readParticipantTokenHash,
} from "@/features/sortie/lib/cookie-token";
import { sendRsvpReceivedEmail } from "@/features/sortie/lib/emails/send-outing-emails";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { ensureSilentUserAccount } from "@/features/sortie/lib/silent-user";
import { formDataToObject } from "@/features/sortie/lib/form-data";
import { runAfterResponse } from "@/features/sortie/lib/after-response";
import { isOutingOwner } from "@/features/sortie/lib/owner";
import { removeParticipantSchema, removeRsvpSchema, rsvpSchema, voteRsvpSchema } from "./schemas";
import type { FormActionState } from "./outing-actions";

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function rsvpAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = rsvpSchema.safeParse(formDataToObject(formData));
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

  // Création silencieuse d'un compte si l'invité fournit un email :
  // au prochain magic-link signin, il retrouvera tous ses RSVP. On
  // récupère un userId à utiliser pour la row participant ; si null
  // (email invalide / banned), on retombe en mode anon classique.
  const silentUserId =
    !user && data.email
      ? await ensureSilentUserAccount({ email: data.email, name: displayName })
      : null;
  const effectiveUserId = user?.id ?? silentUserId;

  // Lookup par cookieTokenHash OU userId (si logué ou silent-account) :
  // sans le 2e bras, un user qui RSVP depuis un nouveau navigateur
  // (cookie tout neuf, mais session loguée existante OU email déjà
  // associé à un user) crée un doublon de participant à la place de
  // mettre à jour celui de l'autre device.
  const identityClause = effectiveUserId
    ? or(
        eq(participants.cookieTokenHash, cookieTokenHash),
        eq(participants.userId, effectiveUserId)
      )!
    : eq(participants.cookieTokenHash, cookieTokenHash);
  const existing = await db.query.participants.findFirst({
    where: and(eq(participants.outingId, outing.id), identityClause),
  });

  if (existing) {
    await db
      .update(participants)
      .set({
        response: data.response,
        extraAdults: data.response === "yes" ? data.extraAdults : 0,
        extraChildren: data.response === "yes" ? data.extraChildren : 0,
        // Quand un userId est rattaché (logué ou silent), on bascule
        // sur le compte : on nettoie anonName/anonEmail pour ne pas
        // dupliquer l'identité dans deux colonnes.
        anonName: effectiveUserId ? null : displayName,
        anonEmail: effectiveUserId ? null : (data.email ?? null),
        userId: effectiveUserId ?? existing.userId,
        // On rapatrie le cookie courant sur le row existant pour que
        // les futurs lookups par cookie sur ce device tombent dessus
        // sans dépendre du fallback userId.
        cookieTokenHash,
        updatedAt: new Date(),
      })
      .where(eq(participants.id, existing.id));
  } else {
    await db.insert(participants).values({
      outingId: outing.id,
      userId: effectiveUserId,
      anonName: effectiveUserId ? null : displayName,
      anonEmail: effectiveUserId ? null : (data.email ?? null),
      cookieTokenHash,
      response: data.response,
      extraAdults: data.response === "yes" ? data.extraAdults : 0,
      extraChildren: data.response === "yes" ? data.extraChildren : 0,
    });
  }

  // Notify the organizer fire-and-forget — le commentaire d'origine disait
  // "fire-and-forget" mais l'await bloquait quand même le retour de l'action
  // sur la latence Resend (200-800 ms typiques). Le helper avale ses propres
  // erreurs, donc void + runAfterResponse fait le bon contrat.
  runAfterResponse(() =>
    sendRsvpReceivedEmail({
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
    })
  );

  // Revalidate the bare-shortId form; the public page's canonical redirect
  // takes care of both the /<shortId> and /<slug-shortId> cache entries.
  revalidatePath(`/${data.shortId}`);
  revalidatePath("/sortie/agenda");
  return {};
}

/**
 * Hard-delete the viewer's participant row — "Retirer ma réponse" on the
 * inline RSVP card. We only match on the identity signals the viewer
 * actually carries (cookie hash for anons, user id for logged-in) so one
 * visitor can never wipe another's RSVP.
 *
 * Cascades: `timeslot_votes` drop via FK cascade, but `purchases`,
 * `allocations`, and `debts` use `restrict` — so a participant who's
 * already recorded a purchase can't retract their RSVP. We surface that
 * as a readable error rather than an opaque FK violation.
 */
export async function removeRsvpAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = removeRsvpSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { shortId } = parsed.data;
  const user = await getSessionUser();
  const cookieTokenHash = await readParticipantTokenHash();

  if (!user && !cookieTokenHash) {
    return { message: "Aucune réponse à retirer." };
  }

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  const identityClauses = [];
  if (cookieTokenHash) {
    identityClauses.push(eq(participants.cookieTokenHash, cookieTokenHash));
  }
  if (user) {
    identityClauses.push(eq(participants.userId, user.id));
  }
  const identity = identityClauses.length === 1 ? identityClauses[0]! : or(...identityClauses)!;

  try {
    await db.delete(participants).where(and(eq(participants.outingId, outing.id), identity));
  } catch {
    // FK restrict from purchases/allocations/debts — the viewer has
    // already committed to financial rows we can't orphan.
    return {
      message: "Impossible de retirer ta réponse (achats ou dépenses déjà enregistrés).",
    };
  }

  revalidatePath(`/${shortId}`);
  revalidatePath("/sortie/agenda");
  return {};
}

/**
 * Owner-only : retirer un participant de la sortie. Seul le créateur
 * (rattaché par userId ou par cookieTokenHash) peut appeler cette action.
 * Les FK `restrict` sur purchases/allocations/debts protègent contre la
 * suppression d'un participant déjà engagé financièrement — on remonte un
 * message lisible à la place de l'erreur opaque.
 */
export async function removeParticipantAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = removeParticipantSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { shortId, participantId } = parsed.data;
  const user = await getSessionUser();
  const cookieTokenHash = await readParticipantTokenHash();

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
  });
  if (!outing) {
    return { message: "Sortie introuvable." };
  }

  if (
    !isOutingOwner(outing, {
      userId: user?.id ?? null,
      cookieTokenHash,
    })
  ) {
    return { message: "Action réservée à l'organisateur." };
  }

  // On scope la suppression à l'outing courant : un participantId valide
  // d'une autre sortie ne doit jamais être effacé via cette action, même
  // si l'appelant est créateur des deux sorties.
  const target = await db.query.participants.findFirst({
    where: and(eq(participants.id, participantId), eq(participants.outingId, outing.id)),
  });
  if (!target) {
    return { message: "Participant introuvable." };
  }

  try {
    await db.delete(participants).where(eq(participants.id, target.id));
  } catch {
    return {
      message: "Impossible de retirer ce participant (achats ou dépenses déjà enregistrés).",
    };
  }

  revalidatePath(`/${shortId}`);
  revalidatePath("/sortie/agenda");
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
  const parsed = voteRsvpSchema.safeParse(formDataToObject(formData));
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

  // Création silencieuse — cf. note dans upsertRsvpAction. L'invité
  // qui vote avec son email récupèrera ses RSVP au prochain magic-link.
  const silentUserId =
    !user && data.email
      ? await ensureSilentUserAccount({ email: data.email, name: displayName })
      : null;
  const effectiveUserId = user?.id ?? silentUserId;

  // Cf. la note dans `upsertRsvpAction` : lookup par cookie OU userId
  // pour ne pas créer un doublon quand l'user vote depuis un nouveau
  // navigateur.
  const voteIdentityClause = effectiveUserId
    ? or(
        eq(participants.cookieTokenHash, cookieTokenHash),
        eq(participants.userId, effectiveUserId)
      )!
    : eq(participants.cookieTokenHash, cookieTokenHash);
  const existing = await db.query.participants.findFirst({
    where: and(eq(participants.outingId, outing.id), voteIdentityClause),
  });

  // Transaction : upsert participant + wipe-and-rewrite des votes doivent
  // être atomiques. Sans transaction, un crash entre le delete des votes
  // et le insert laisserait le participant avec un set de votes vide alors
  // que sa réponse vient d'être mise à jour à "interested" — état
  // incohérent côté UI (badge "voté" sans aucun créneau).
  await db.transaction(async (tx) => {
    let participantId: string;
    if (existing) {
      await tx
        .update(participants)
        .set({
          response,
          extraAdults: data.extraAdults,
          extraChildren: data.extraChildren,
          anonName: effectiveUserId ? null : displayName,
          anonEmail: effectiveUserId ? null : (data.email ?? null),
          userId: effectiveUserId ?? existing.userId,
          cookieTokenHash,
          updatedAt: new Date(),
        })
        .where(eq(participants.id, existing.id));
      participantId = existing.id;
    } else {
      const [row] = await tx
        .insert(participants)
        .values({
          outingId: outing.id,
          userId: effectiveUserId,
          anonName: effectiveUserId ? null : displayName,
          anonEmail: effectiveUserId ? null : (data.email ?? null),
          cookieTokenHash,
          response,
          extraAdults: data.extraAdults,
          extraChildren: data.extraChildren,
        })
        .returning({ id: participants.id });
      participantId = row.id;
    }

    // Wipe-and-rewrite is fine here — composite PK on (participantId, timeslotId)
    // means we can't UPSERT-with-conflict cheaply, and a handful of rows per
    // participant keeps the write cost négligeable.
    await tx.delete(timeslotVotes).where(eq(timeslotVotes.participantId, participantId));
    if (filtered.length > 0) {
      await tx.insert(timeslotVotes).values(
        filtered.map((v) => ({
          participantId,
          timeslotId: v.timeslotId,
          available: v.available,
        }))
      );
    }
  });

  revalidatePath(`/${data.shortId}`);
  revalidatePath("/sortie/agenda");
  return {};
}
