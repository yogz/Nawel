"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import { userFollows } from "@drizzle/sortie-schema";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { runAfterResponse } from "@/features/sortie/lib/after-response";
import { sendNewFollowerEmail } from "@/features/sortie/lib/emails/send-follow-emails";
import type { FormActionState } from "./outing-actions";

// Message volontairement vague — pas de signal sur le statut côté
// proprio (existence du compte, présence d'un token, validité du token).
const VAGUE_REJECT = "Lien invalide ou expiré.";

/**
 * Suivre un user. Gate côté action :
 *   - session requise
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
