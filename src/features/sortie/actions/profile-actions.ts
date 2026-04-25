"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { deletePreviousAvatar, uploadAvatar } from "@/features/sortie/lib/avatar-upload";
import { after } from "next/server";
import type { FormActionState } from "./outing-actions";

// Usernames are the slug users type at `sortie.colist.fr/@<username>`, so
// we keep the charset tight: lowercase ASCII letters, digits, dash,
// underscore. Length capped at 30 to keep URLs readable.
const USERNAME_REGEX = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/;

// Words we don't want to hand out so a malicious user can't pose as the
// app (`@admin`, `@api`) or squat on reserved routing segments.
const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "app",
  "contact",
  "help",
  "login",
  "logout",
  "me",
  "moi",
  "root",
  "settings",
  "sortie",
  "sortie-admin",
  "support",
  "system",
  "undefined",
  "null",
]);

const updateUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .refine((u) => USERNAME_REGEX.test(u), {
      message:
        "Entre 3 et 30 caractères : minuscules, chiffres, - ou _. Pas de - ou _ au début/à la fin.",
    })
    .refine((u) => !RESERVED_USERNAMES.has(u), {
      message: "Ce nom est réservé, choisis-en un autre.",
    }),
});

function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") {
      obj[k] = v;
    }
  }
  return obj;
}

export async function updateUsernameAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { message: "Il faut être connecté pour choisir un nom d'utilisateur." };
  }

  const parsed = updateUsernameSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { username } = parsed.data;

  const gate = await rateLimit({
    key: `username:${session.user.id}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  // Check uniqueness ourselves so we can return a friendly error instead of
  // the raw Postgres constraint violation.
  const collision = await db.query.user.findFirst({
    where: and(sql`lower(${user.username}) = ${username}`, ne(user.id, session.user.id)),
    columns: { id: true },
  });
  if (collision) {
    return { errors: { username: ["Ce nom est déjà pris."] } };
  }

  await db
    .update(user)
    .set({ username, updatedAt: new Date() })
    .where(eq(user.id, session.user.id));

  revalidatePath("/moi");
  revalidatePath(`/@${username}`);
  return {};
}

const updateProfileDetailsSchema = z.object({
  bio: z
    .string()
    .trim()
    .max(160, "Bio trop longue (160 caractères max).")
    .optional()
    .transform((v) => v || null),
});

/**
 * Updates the short bio. Social handle fields (Instagram / TikTok)
 * were removed from the form per user feedback — the columns stay
 * in the schema for now so historical data isn't lost, but we no
 * longer write to them from this action.
 */
export async function updateProfileDetailsAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { message: "Il faut être connecté pour modifier ton profil." };
  }

  const parsed = updateProfileDetailsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const gate = await rateLimit({
    key: `profile:${session.user.id}`,
    limit: 20,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  const { bio } = parsed.data;

  await db
    .update(user)
    .set({
      // Sanitise the bio the same way we sanitise outing descriptions —
      // strips any HTML so a future component that forgets to escape
      // still can't render a stored XSS.
      bio: bio ? sanitizeText(bio, 160) : null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, session.user.id));

  revalidatePath("/moi");
  const row = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { username: true },
  });
  if (row?.username) {
    revalidatePath(`/@${row.username}`);
  }
  return { message: "Profil mis à jour." };
}

/**
 * Avatar upload. Accepts the raw `File` from a native file input,
 * validates size + MIME + magic-byte sniffing, pushes to Vercel Blob,
 * and updates `user.image` with the resulting URL. The old avatar
 * stays in Blob for now — cost is negligible and writing a retention
 * job is follow-up work.
 */
/**
 * Avatar action state. Carries the canonical Blob URL on success so
 * the picker can swap its optimistic blob: preview for the real URL
 * without waiting for `router.refresh()` to round-trip — and so the
 * old blob URL gets revoked instead of leaking until the tab closes.
 */
export type AvatarActionState = FormActionState & {
  imageUrl?: string;
};

export async function updateAvatarAction(
  _prev: AvatarActionState,
  formData: FormData
): Promise<AvatarActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { message: "Il faut être connecté pour changer ta photo." };
  }

  const gate = await rateLimit({
    key: `avatar:${session.user.id}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { message: "Aucun fichier reçu." };
  }

  try {
    // Read the old URL up-front so we can clean it up after the
    // response. Same query also gives us the username for the public
    // profile revalidation below — saves a round trip.
    const previous = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { image: true, username: true },
    });

    const result = await uploadAvatar(file);
    if (!result.ok) {
      return { message: result.message };
    }

    await db
      .update(user)
      .set({ image: result.url, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));

    // Revalidate against the *real* app routes, not the user-facing URLs.
    // `proxy.ts` rewrites `/moi` → `/sortie/moi` and `/@<u>` → `/sortie/profile/<u>`,
    // so the previous `revalidatePath("/moi")` / `revalidatePath("/@${u}")` calls
    // were no-ops — they targeted paths that don't exist on the rendered tree.
    // We also bust `/sortie` (home) since the nav avatar there reads from the
    // user row.
    revalidatePath("/sortie");
    revalidatePath("/sortie/moi");
    if (previous?.username) {
      revalidatePath(`/sortie/profile/${previous.username}`);
    }

    // Fire-and-forget the orphan cleanup *after* the response is
    // flushed to the user. The new avatar is already saved; this is
    // pure housekeeping and should never gate the round-trip. `after()`
    // (Next.js 14.2+) runs the callback on the same request lifecycle
    // but without holding the response open.
    after(async () => {
      await deletePreviousAvatar(previous?.image ?? null);
    });

    return { message: "Photo mise à jour.", imageUrl: result.url };
  } catch (err) {
    // Catch-all so the client gets a readable message instead of a
    // generic Next.js 500 with an opaque digest. The stack is logged
    // server-side for correlation with the digest in Vercel logs.
    console.error("[updateAvatarAction] unexpected failure", {
      userId: session.user.id,
      error: err,
    });
    return { message: "Erreur serveur pendant l'upload. Réessaie ou contacte-nous." };
  }
}
