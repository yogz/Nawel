"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import { userFollows } from "@drizzle/sortie-schema";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { sendNewFollowerEmail } from "@/features/sortie/lib/emails/send-follow-emails";
import type { FormActionState } from "./outing-actions";

/**
 * Follow gate :
 *   1. Le suiveur doit être connecté (besoin d'une identité stable côté
 *      `user.id` — un anon-cookie ne survivrait pas à un changement de
 *      device et casserait le contrat "tu suis = tu vois ses sorties").
 *   2. Le suiveur doit fournir l'`inviteToken` actuel du créateur (pris
 *      du `?k=` sur l'URL `/@<username>`). Sans ça, n'importe qui
 *      pourrait suivre n'importe qui — le lien privé reste le filtre
 *      d'entrée. La rotation du token NE casse PAS les follows déjà
 *      établis (cf. user_follows.ts) ; c'est juste le portail.
 *   3. Pas d'auto-follow.
 *
 * Idempotent : un 2ᵉ click sur "Suivre" ne crée pas une 2ᵉ row (PK
 * composite + ON CONFLICT DO NOTHING). On utilise ce signal pour
 * n'envoyer l'email "nouveau suiveur" qu'à la 1ʳᵉ insertion réelle.
 */
export async function followUserAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { message: "Il faut être connecté pour suivre quelqu'un." };
  }

  const followedUserId = String(formData.get("followedUserId") ?? "").trim();
  const inviteToken = String(formData.get("inviteToken") ?? "").trim();
  if (!followedUserId || !inviteToken) {
    return { message: "Lien invalide. Demande à ton ami son lien privé." };
  }
  if (followedUserId === session.user.id) {
    return { message: "Tu ne peux pas te suivre toi-même." };
  }

  // 10 follows / heure / suiveur — large pour un usage normal (clic sur
  // 4-5 amis), bloque un script qui essaierait d'énumérer.
  const gate = await rateLimit({
    key: `follow-user:${session.user.id}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  const target = await db.query.user.findFirst({
    where: eq(user.id, followedUserId),
    columns: {
      id: true,
      name: true,
      email: true,
      username: true,
      rsvpInviteToken: true,
    },
  });
  if (!target) {
    return { message: "Profil introuvable." };
  }
  if (!target.rsvpInviteToken || target.rsvpInviteToken !== inviteToken) {
    // Volontairement vague — on ne distingue pas "pas de token" de
    // "mauvais token" pour ne donner aucun signal au visiteur sur le
    // statut du token côté propriétaire (même posture que la page profil).
    return { message: "Lien invalide. Demande à ton ami son lien privé." };
  }

  // ON CONFLICT DO NOTHING + RETURNING pour distinguer "row insérée" de
  // "déjà follower" — on ne re-spamme pas l'email de notif sur un
  // 2ᵉ click ou un retour-arrière.
  const inserted = await db
    .insert(userFollows)
    .values({
      followerUserId: session.user.id,
      followedUserId: target.id,
    })
    .onConflictDoNothing()
    .returning({ followerUserId: userFollows.followerUserId });

  if (inserted.length > 0 && target.email) {
    await sendNewFollowerEmail({
      to: target.email,
      followedName: target.name,
      followerName: session.user.name ?? "Quelqu'un",
    });
  }

  if (target.username) {
    revalidatePath(`/@${target.username}`);
  }
  revalidatePath("/");
  revalidatePath("/moi");
  return {};
}

/**
 * Le suiveur lui-même retire son follow. Pas de gate token (contrairement
 * à follow), juste la session — quitter une relation est toujours unilatéral.
 */
export async function unfollowUserAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { message: "Il faut être connecté." };
  }

  const followedUserId = String(formData.get("followedUserId") ?? "").trim();
  if (!followedUserId) {
    return { message: "Cible invalide." };
  }

  await db
    .delete(userFollows)
    .where(
      and(
        eq(userFollows.followerUserId, session.user.id),
        eq(userFollows.followedUserId, followedUserId)
      )
    );

  // Revalide la page profil + les listings où la sortie suivie peut
  // disparaître (carousel home).
  const target = await db.query.user.findFirst({
    where: eq(user.id, followedUserId),
    columns: { username: true },
  });
  if (target?.username) {
    revalidatePath(`/@${target.username}`);
  }
  revalidatePath("/");
  revalidatePath("/moi");
  return {};
}

/**
 * Le créateur retire un de ses suiveurs depuis sa liste sur /moi.
 * Symétrique de `unfollowUserAction` mais inversé côté identité —
 * `session.user.id` doit être le `followedUserId` de la row à virer.
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
    return { message: "Cible invalide." };
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
