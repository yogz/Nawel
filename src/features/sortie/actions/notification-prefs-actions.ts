"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import type { FormActionState } from "./outing-actions";

/**
 * Toggle de la préférence "recevoir un email à chaque nouvelle sortie d'un
 * user que je suis". Source de vérité unique : `user.notifyOnFollowedOuting`.
 *
 * Pas de rate-limit : l'action est gated par session, et un user qui spam
 * la checkbox ne fait que toggle son propre champ — pas de vecteur d'abus.
 */
export async function updateNotificationPrefsAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { message: "Il faut être connecté." };
  }

  // HTML checkbox absent = false. Présent = true (valeur "on" ou autre).
  const notify = formData.has("notifyOnFollowedOuting");

  await db.update(user).set({ notifyOnFollowedOuting: notify }).where(eq(user.id, session.user.id));

  revalidatePath("/moi");
  return {};
}
