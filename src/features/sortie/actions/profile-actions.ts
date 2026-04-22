"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
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
