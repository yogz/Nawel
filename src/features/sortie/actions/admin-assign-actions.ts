"use server";

import { randomBytes, createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import {
  auditLog,
  outingTimeslots,
  outings,
  participants,
  rsvpResponse,
  timeslotVotes,
} from "@drizzle/sortie-schema";
import { assertSortieAdmin } from "@/features/sortie/lib/require-sortie-admin";
import { ADMIN_AUDIT } from "@/features/sortie/lib/admin-audit-actions";
import { resolveAdminPollVotes } from "@/features/sortie/lib/admin-poll-votes";
import { plural } from "@/features/sortie/lib/plural";
import { formDataToObject } from "@/features/sortie/lib/form-data";
import { shortIdSchema } from "./schemas";

// État renvoyé au client par useActionState — message neutre `ok`
// (succès) ou `error` (échec lisible). Pas d'errors de schéma exposées :
// l'admin tape les valeurs lui-même, un message simple suffit.
export type AssignActionState = {
  ok?: string;
  error?: string;
};

const responseSchema = z.enum(rsvpResponse.enumValues);

const assignSchema = z.object({
  shortId: shortIdSchema,
  email: z.string().trim().toLowerCase().email().max(255),
  // Absent pour un sondage non tranché : la réponse découle des créneaux
  // cochés (cf. `resolveAdminPollVotes`).
  response: responseSchema.optional(),
  extraAdults: z.coerce.number().int().min(0).max(10).default(0),
  extraChildren: z.coerce.number().int().min(0).max(10).default(0),
});

/**
 * Génère un cookie_token_hash placeholder pour les rows participants
 * créés manuellement par admin — le user n'a pas encore touché à la
 * sortie depuis son device, on remplit l'unique constraint avec un hash
 * aléatoire qui ne correspondra jamais à un cookie réel. Le lookup
 * ultérieur côté app se fait par `userId` (logué) ou réécrase le
 * cookie hash quand l'user RSVP depuis son téléphone (cf. la logique
 * d'upsert dans rsvpAction).
 */
function generatePlaceholderCookieHash(): string {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

/**
 * Action admin : ajoute (ou met à jour) une row participant pour un
 * user existant, identifié par son email. Pour les cas où on doit
 * forcer une présence sans passer par le flow RSVP normal (compte
 * silencieux pas encore activé, user incapable d'accéder au lien, etc.).
 *
 * Sur un sondage non tranché, l'admin coche les créneaux à la place de
 * l'invité (champ `timeslotId` répété) : ses votes remplacent les
 * précédents, et `pickTimeslotAction` le basculera en yes/no comme un
 * votant normal. Autorisé après la deadline — c'est l'outil de rattrapage.
 *
 * Re-vérifie `assertSortieAdmin` (défense en profondeur — le layout
 * gate déjà la vue, mais une mutation doit toujours re-checker).
 */
export async function adminAssignUserToOutingAction(
  _prev: AssignActionState,
  formData: FormData
): Promise<AssignActionState> {
  const session = await assertSortieAdmin();

  const parsed = assignSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstFieldError = Object.values(flat.fieldErrors).flat()[0];
    return { error: firstFieldError ?? "Données invalides." };
  }
  const { shortId, email, extraAdults, extraChildren } = parsed.data;

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
  });
  if (!outing) {
    return { error: `Sortie "${shortId}" introuvable.` };
  }
  if (outing.status === "cancelled") {
    return { error: "Cette sortie est annulée." };
  }

  const isOpenPoll = outing.mode === "vote" && outing.chosenTimeslotId === null;
  let pollVotes: ReturnType<typeof resolveAdminPollVotes> | null = null;
  if (isOpenPoll) {
    const slots = await db
      .select({ id: outingTimeslots.id })
      .from(outingTimeslots)
      .where(eq(outingTimeslots.outingId, outing.id));
    const checked = formData.getAll("timeslotId").filter((v): v is string => typeof v === "string");
    pollVotes = resolveAdminPollVotes(
      checked,
      slots.map((s) => s.id)
    );
  }
  const response = pollVotes?.response ?? parsed.data.response;
  if (!response) {
    return { error: "Choisis une réponse." };
  }

  // Lookup case-insensitive : Better Auth stocke l'email saisi tel quel
  // (avec sa casse), mais l'unique index est sur `email` raw. On utilise
  // `lower()` pour matcher quel que soit la casse tapée par l'admin.
  const targetUser = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`)
    .limit(1)
    .then((rows) => rows[0]);
  if (!targetUser) {
    return { error: `Aucun compte avec l'email "${email}".` };
  }

  // Upsert : si une row participant existe déjà pour ce user sur cette
  // sortie, on update son response + extras. Sinon on insert avec un
  // cookie hash placeholder.
  const existing = await db.query.participants.findFirst({
    where: and(eq(participants.outingId, outing.id), eq(participants.userId, targetUser.id)),
  });

  // Comme `castVoteAction`, un vote de sondage garde les extras quelle que
  // soit la réponse : le pick les reporte sur le yes final.
  const keepExtras = response === "yes" || pollVotes !== null;

  await db.transaction(async (tx) => {
    let participantId: string;
    if (existing) {
      participantId = existing.id;
      await tx
        .update(participants)
        .set({
          response,
          extraAdults: keepExtras ? extraAdults : 0,
          extraChildren: keepExtras ? extraChildren : 0,
          anonName: null,
          anonEmail: null,
          updatedAt: new Date(),
        })
        .where(eq(participants.id, existing.id));
    } else {
      const [row] = await tx
        .insert(participants)
        .values({
          outingId: outing.id,
          userId: targetUser.id,
          cookieTokenHash: generatePlaceholderCookieHash(),
          response,
          extraAdults: keepExtras ? extraAdults : 0,
          extraChildren: keepExtras ? extraChildren : 0,
        })
        .returning({ id: participants.id });
      participantId = row.id;
    }
    if (pollVotes) {
      await tx.delete(timeslotVotes).where(eq(timeslotVotes.participantId, participantId));
      if (pollVotes.votes.length > 0) {
        await tx
          .insert(timeslotVotes)
          .values(pollVotes.votes.map((v) => ({ participantId, ...v })));
      }
    }
    await tx.insert(auditLog).values({
      actorUserId: session.user.id,
      outingId: outing.id,
      action: ADMIN_AUDIT.OUTING_ADMIN_PARTICIPANT_ASSIGNED,
      payload: JSON.stringify({
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        response,
        extraAdults: keepExtras ? extraAdults : 0,
        extraChildren: keepExtras ? extraChildren : 0,
        upsert: existing ? "update" : "insert",
        ...(pollVotes ? { votes: pollVotes.votes } : {}),
      }),
    });
  });

  // Le rendu de la sortie + l'agenda du user doivent refléter l'ajout
  // immédiatement (le user verra "tu y vas" sur ton agenda dès qu'il se
  // connectera).
  revalidatePath(`/${outing.shortId}`);
  revalidatePath("/sortie/agenda");

  const verb = existing ? "mis à jour" : "ajouté";
  const availableCount = pollVotes?.votes.filter((v) => v.available).length ?? 0;
  const detail = pollVotes
    ? `${availableCount} ${plural(availableCount, "créneau coché", "créneaux cochés")}`
    : response;
  return {
    ok: `${targetUser.name} ${verb} sur "${outing.title}" (${detail}).`,
  };
}

const changeCreatorSchema = z.object({
  shortId: shortIdSchema,
  email: z.string().trim().toLowerCase().email().max(255),
});

/**
 * Action admin : ré-attribue une sortie à un autre user (par email).
 *   - `creatorUserId` ← nouveau user
 *   - `creatorAnonName/Email/CookieTokenHash` ← null (le nouveau créateur
 *     est un compte réel, plus aucun fallback anon)
 *   - `sequence++` pour signaler le changement aux clients iCal
 *     subscribed (RFC 5545 §3.8.7.4 — sans bump, Apple/Outlook ne
 *     re-rendent pas leur copie locale)
 *
 * N'altère pas la table `participants` — l'ancien créateur conserve
 * sa row RSVP s'il en avait une (et inversement, le nouveau ne reçoit
 * pas de RSVP automatique : à faire séparément via l'autre formulaire
 * de cette page).
 */
export async function adminChangeCreatorAction(
  _prev: AssignActionState,
  formData: FormData
): Promise<AssignActionState> {
  const session = await assertSortieAdmin();

  const parsed = changeCreatorSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstFieldError = Object.values(flat.fieldErrors).flat()[0];
    return { error: firstFieldError ?? "Données invalides." };
  }
  const { shortId, email } = parsed.data;

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
  });
  if (!outing) {
    return { error: `Sortie "${shortId}" introuvable.` };
  }

  const targetUser = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`)
    .limit(1)
    .then((rows) => rows[0]);
  if (!targetUser) {
    return { error: `Aucun compte avec l'email "${email}".` };
  }

  if (outing.creatorUserId === targetUser.id) {
    return { ok: `${targetUser.name} est déjà le créateur de "${outing.title}".` };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(outings)
      .set({
        creatorUserId: targetUser.id,
        creatorAnonName: null,
        creatorAnonEmail: null,
        creatorCookieTokenHash: null,
        sequence: outing.sequence + 1,
        updatedAt: new Date(),
      })
      .where(eq(outings.id, outing.id));

    await tx.insert(auditLog).values({
      actorUserId: session.user.id,
      outingId: outing.id,
      action: ADMIN_AUDIT.OUTING_ADMIN_CREATOR_CHANGED,
      payload: JSON.stringify({
        previousCreatorUserId: outing.creatorUserId,
        previousCreatorAnonName: outing.creatorAnonName,
        newCreatorUserId: targetUser.id,
        newCreatorEmail: targetUser.email,
      }),
    });
  });

  revalidatePath(`/${outing.shortId}`);
  revalidatePath("/sortie/agenda");

  return {
    ok: `${targetUser.name} est maintenant créateur de "${outing.title}".`,
  };
}
