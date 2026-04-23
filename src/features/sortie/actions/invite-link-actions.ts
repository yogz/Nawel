"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import type { FormActionState } from "./outing-actions";

// 24 random bytes → 32 chars base64url. Plenty of entropy against brute
// force given the rate-limited compare on the public profile page, and
// short enough to paste in a WhatsApp DM without wrapping.
function mintToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function generateInviteLinkAction(
  _prev: FormActionState,
  _formData: FormData
): Promise<FormActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { message: "Il faut être connecté." };
  }

  const gate = await rateLimit({
    key: `invite-link:${session.user.id}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  const token = mintToken();
  await db
    .update(user)
    .set({ rsvpInviteToken: token, updatedAt: new Date() })
    .where(eq(user.id, session.user.id));

  revalidatePath("/moi");
  // The public profile renders differently depending on the token, so flush
  // its cache too — otherwise a rotation might still serve the old page.
  const u = session.user as { username?: string | null };
  if (u.username) {
    revalidatePath(`/@${u.username}`);
  }
  return {};
}

export async function revokeInviteLinkAction(
  _prev: FormActionState,
  _formData: FormData
): Promise<FormActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { message: "Il faut être connecté." };
  }

  const gate = await rateLimit({
    key: `invite-link:${session.user.id}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  await db
    .update(user)
    .set({ rsvpInviteToken: null, updatedAt: new Date() })
    .where(eq(user.id, session.user.id));

  revalidatePath("/moi");
  const u = session.user as { username?: string | null };
  if (u.username) {
    revalidatePath(`/@${u.username}`);
  }
  return {};
}
