"use server";

import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import { userFollows } from "@drizzle/sortie-schema";
import { formDataToObject } from "@/features/sortie/lib/form-data";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { runAfterResponse } from "@/features/sortie/lib/after-response";
import { sendNewFollowerEmail } from "@/features/sortie/lib/emails/send-follow-emails";
import { followEmailUpsellSchema } from "./schemas";
import type { FormActionState } from "./outing-actions";

const SORTIE_BASE_URL = (process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr").replace(
  /\/$/,
  ""
);

// Message volontairement vague — pas de signal sur le statut côté
// proprio (existence du compte, présence d'un token, validité du token).
const VAGUE_REJECT = "Lien invalide ou expiré.";

/**
 * Suivre un user. Gate côté action :
 *   - session requise
 *   - email vérifié (pas de follow depuis un compte non-confirmé : sinon
 *     `userFollows` se peuple de rows attachées à des users qu'on ne peut
 *     ni notifier ni vraiment authentifier — defense-in-depth, l'UI
 *     remplace déjà le toggle par un upsell pour ce cas)
 *   - pas de self-follow
 *   - target existe + a un rsvpInviteToken
 *   - token transmis === target.rsvpInviteToken (équivalent à passer
 *     par le lien privé /@<username>?k=<token>)
 *
 * `INSERT … ON CONFLICT DO NOTHING RETURNING` garantit qu'on n'envoie
 * l'email "X te suit" qu'au premier follow effectif (le 2e tap rapide
 * tombe dans le ON CONFLICT et returning vide → pas de double-email).
 */
export async function followUserAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { message: "Il faut être connecté." };
  }
  if (!session.user.emailVerified) {
    return { message: VAGUE_REJECT };
  }

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  const inviteToken = String(formData.get("inviteToken") ?? "").trim();
  if (!targetUserId || !inviteToken) {
    return { message: VAGUE_REJECT };
  }
  if (targetUserId === session.user.id) {
    return { message: VAGUE_REJECT };
  }

  const gate = await rateLimit({
    key: `follow:${session.user.id}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  const target = await db.query.user.findFirst({
    where: eq(user.id, targetUserId),
    columns: { id: true, name: true, email: true, username: true, rsvpInviteToken: true },
  });
  if (!target || !target.rsvpInviteToken || target.rsvpInviteToken !== inviteToken) {
    return { message: VAGUE_REJECT };
  }

  const inserted = await db
    .insert(userFollows)
    .values({
      followerUserId: session.user.id,
      followedUserId: target.id,
    })
    .onConflictDoNothing()
    .returning({ followerUserId: userFollows.followerUserId });

  revalidatePath("/");
  if (target.username) {
    revalidatePath(`/@${target.username}`);
  }
  revalidatePath("/moi");

  if (inserted.length > 0) {
    const followerName = session.user.name ?? "Quelqu'un";
    runAfterResponse(() =>
      sendNewFollowerEmail({
        creator: { email: target.email, name: target.name },
        followerName,
      })
    );
  }

  return {};
}

/**
 * Le suiveur se retire lui-même. Pas de gate token — il a déjà la
 * relation, il n'a pas à re-prouver l'accès au lien privé.
 */
export async function unfollowUserAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { message: "Il faut être connecté." };
  }

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  if (!targetUserId) {
    return { message: VAGUE_REJECT };
  }

  const gate = await rateLimit({
    key: `follow:${session.user.id}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  await db
    .delete(userFollows)
    .where(
      and(
        eq(userFollows.followerUserId, session.user.id),
        eq(userFollows.followedUserId, targetUserId)
      )
    );

  revalidatePath("/");
  const target = await db.query.user.findFirst({
    where: eq(user.id, targetUserId),
    columns: { username: true },
  });
  if (target?.username) {
    revalidatePath(`/@${target.username}`);
  }
  revalidatePath("/moi");

  return {};
}

/**
 * Le créateur retire un suiveur depuis /moi. Le delete est borné par
 * `followedUserId = session.user.id` — un user ne peut retirer que ses
 * propres suiveurs, jamais un follow où il n'est pas la cible.
 */
export async function removeFollowerAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { message: "Il faut être connecté." };
  }

  const followerUserId = String(formData.get("followerUserId") ?? "").trim();
  if (!followerUserId) {
    return { message: VAGUE_REJECT };
  }

  const gate = await rateLimit({
    key: `follow:${session.user.id}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  await db
    .delete(userFollows)
    .where(
      and(
        eq(userFollows.followerUserId, followerUserId),
        eq(userFollows.followedUserId, session.user.id)
      )
    );

  revalidatePath("/moi");
  return {};
}

/**
 * Upsell email pour les users logués non-vérifiés qui tentent de follow
 * un créateur. Calqué sur `submitEmailClaimAction` (claim-prompt) mais
 * SANS dépendance au `cookieTokenHash` — un user logué non-vérifié n'a
 * pas forcément RSVP, on doit pouvoir l'aider à entrer dans le réseau
 * juste pour follow.
 *
 * Sécu : `auth.api.signInMagicLink` crée le user à la verif si absent.
 * Le merge cookie→userId existant (cf. `databaseHooks.session.create.after`
 * dans auth-config) reste actif si l'user a un cookie token traînant.
 *
 * On ne valide PAS `inviteToken` côté serveur ici : un token foireux ne
 * fait que pourrir l'URL de retour, le follow lui-même reste gated par
 * `followUserAction` qui re-vérifie target.rsvpInviteToken.
 */
export async function submitFollowEmailAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = followEmailUpsellSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { email, creatorUsername, inviteToken } = parsed.data;

  const gate = await rateLimit({
    key: `follow-email:${email.toLowerCase()}`,
    limit: 3,
    windowSeconds: 900,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  // Display name du créateur pour le copy email — fallback sur l'username
  // brut si la row n'a pas de name. Pattern reused depuis claim-prompt.
  const creatorRow = await db.query.user.findFirst({
    where: sql`lower(${user.username}) = ${creatorUsername.toLowerCase()}`,
    columns: { name: true, username: true },
  });
  const creatorDisplay = creatorRow?.name?.trim() || creatorRow?.username || creatorUsername;

  // callbackURL préserve le `?k=…` pour que post-vérif l'user atterrisse
  // sur le bouton "+ Suivre" actif (sans token, le toggle disparaîtrait).
  const callbackURL = `${SORTIE_BASE_URL}/@${creatorUsername}?k=${encodeURIComponent(inviteToken)}`;

  try {
    await auth.api.signInMagicLink({
      headers: await headers(),
      body: {
        email,
        callbackURL,
        metadata: {
          source: "follow-gate",
          creatorName: creatorDisplay,
        },
      },
    });
  } catch (err) {
    console.error("[follow-gate] magic-link send failed:", err);
    return { message: "Lien introuvable — réessaie dans un instant." };
  }

  return { message: "Lien envoyé. Vérifie ta boîte." };
}
