"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";

/**
 * Active le flux iCal personnel : génère un token random unique et le
 * stocke sur `user.calendar_token`. Idempotent — si le token existe
 * déjà, on retourne l'existant (pas de rotation involontaire).
 *
 * Token format : 32 caractères base64url générés via `crypto.randomBytes(24)`.
 * 24 octets → 32 chars base64 sans padding, ~192 bits d'entropie. Largement
 * suffisant pour un bearer non-guessable.
 */
export async function activateCalendarFeedAction(): Promise<{
  ok: boolean;
  token?: string;
  message?: string;
}> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { ok: false, message: "Connexion requise." };
  }

  const existing = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { calendarToken: true },
  });

  if (existing?.calendarToken) {
    return { ok: true, token: existing.calendarToken };
  }

  const token = randomBytes(24).toString("base64url");
  await db.update(user).set({ calendarToken: token }).where(eq(user.id, session.user.id));

  // /moi affiche le token — on revalide pour que la prochaine
  // navigation montre l'URL générée.
  revalidatePath("/moi");

  return { ok: true, token };
}

/**
 * Régénère le token : utile si l'utilisateur a leaked son URL ou
 * change de device et veut couper l'accès. Action destructive — la
 * subscription Calendar de l'utilisateur sur l'ancienne URL renverra
 * 404 dès la prochaine sync.
 */
export async function rotateCalendarFeedAction(): Promise<{
  ok: boolean;
  token?: string;
  message?: string;
}> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { ok: false, message: "Connexion requise." };
  }

  const token = randomBytes(24).toString("base64url");
  await db.update(user).set({ calendarToken: token }).where(eq(user.id, session.user.id));

  revalidatePath("/moi");

  return { ok: true, token };
}
