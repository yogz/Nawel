"use server";

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { auditLog } from "@drizzle/sortie-schema";
import { sanitizeStrictText } from "@/lib/sanitize";
import { assertSortieAdmin } from "@/features/sortie/lib/require-sortie-admin";
import { ADMIN_AUDIT } from "@/features/sortie/lib/admin-audit-actions";
import { formDataToObject } from "@/features/sortie/lib/form-data";

export type AdminUserActionState = {
  ok?: string;
  error?: string;
};

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const nameSchema = z.string().trim().min(1).max(100);
const roleSchema = z.enum(["user", "admin"]);

// Username : lowercased, alphanumérique + tirets + underscores. Optionnel
// (vide = pas d'username). On reste laxiste sur le contenu côté admin
// (l'app gère ses propres règles dans les action utilisateur), juste un
// minimum de safety pour éviter caractères de contrôle.
const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(30)
  .regex(/^[a-z0-9_-]*$/, "Username : a-z, 0-9, - et _ uniquement.");

// `emailVerified` arrive en string ("true"/"false" ou "on"/"off" selon
// le checkbox HTML). La présence de la clé dans le formData = checkbox
// coché ; absence = décoché. On normalise via une union laxiste.
const checkboxSchema = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal(""), z.undefined()])
  .transform((v) => v === "on" || v === "true");

const createSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  username: usernameSchema.optional(),
  role: roleSchema.default("user"),
  emailVerified: checkboxSchema,
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: nameSchema,
  email: emailSchema,
  username: usernameSchema.optional(),
  role: roleSchema,
  emailVerified: checkboxSchema,
});

/**
 * Action admin : crée un user de toutes pièces. À utiliser pour
 * pré-provisionner un compte avant qu'il signe (ex : ajout manuel d'un
 * invité par email pour le rattacher à des sorties via /admin/assign).
 *
 * `emailVerified=false` = compte silencieux (équivalent au flow
 * `ensureSilentUserAccount`). Better Auth créera la row `account` au
 * 1er signin magic-link.
 */
export async function adminCreateUserAction(
  _prev: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  const session = await assertSortieAdmin();

  const parsed = createSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { error: pickFirstError(parsed.error) };
  }
  const { name, email, username, role, emailVerified } = parsed.data;

  const safeName = sanitizeStrictText(name, 100);
  if (!safeName) {
    return { error: "Nom invalide après sanitize." };
  }

  // Unicité email (case-insensitive — Better Auth stocke la casse mais
  // on traite comme identique "Bob@x.com" vs "bob@x.com" pour le lookup).
  const emailConflict = await db.query.user.findFirst({
    where: sql`lower(${user.email}) = ${email}`,
    columns: { id: true, name: true },
  });
  if (emailConflict) {
    return { error: `Email "${email}" déjà utilisé par "${emailConflict.name}".` };
  }

  if (username) {
    const usernameConflict = await db.query.user.findFirst({
      where: eq(user.username, username),
      columns: { id: true },
    });
    if (usernameConflict) {
      return { error: `Username "@${username}" déjà pris.` };
    }
  }

  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id,
      name: safeName,
      email,
      username: username || null,
      role,
      emailVerified,
    });
    await tx.insert(auditLog).values({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT.USER_ADMIN_CREATED,
      payload: JSON.stringify({ targetUserId: id, email, role, emailVerified }),
    });
    if (role === "admin") {
      // Tracer la promotion comme événement distinct — facilite l'audit
      // "qui a obtenu admin et quand" via une query ciblée.
      await tx.insert(auditLog).values({
        actorUserId: session.user.id,
        action: ADMIN_AUDIT.USER_ADMIN_ROLE_PROMOTED,
        payload: JSON.stringify({ targetUserId: id, email, source: "create" }),
      });
    }
  });

  revalidatePath("/admin/users");
  return { ok: `User "${safeName}" créé.` };
}

/**
 * Action admin : édite un user existant. Cibles principales : les
 * comptes silencieux (`emailVerified=false`) créés par
 * `ensureSilentUserAccount` qui ont souvent un name dérivé de l'email
 * (`bob` extrait de `bob@x.com`) qu'on veut humaniser.
 *
 * Vérifie l'unicité email/username sur les autres rows si l'admin a
 * changé l'une de ces valeurs.
 */
export async function adminUpdateUserAction(
  _prev: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  const session = await assertSortieAdmin();

  const parsed = updateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { error: pickFirstError(parsed.error) };
  }
  const { id, name, email, username, role, emailVerified } = parsed.data;

  const safeName = sanitizeStrictText(name, 100);
  if (!safeName) {
    return { error: "Nom invalide après sanitize." };
  }

  const existing = await db.query.user.findFirst({ where: eq(user.id, id) });
  if (!existing) {
    return { error: "User introuvable." };
  }

  if (email !== existing.email.toLowerCase()) {
    const emailConflict = await db.query.user.findFirst({
      where: sql`lower(${user.email}) = ${email} AND ${user.id} != ${id}`,
      columns: { id: true, name: true },
    });
    if (emailConflict) {
      return { error: `Email "${email}" déjà utilisé par "${emailConflict.name}".` };
    }
  }

  if (username && username !== existing.username) {
    const usernameConflict = await db.query.user.findFirst({
      where: sql`${user.username} = ${username} AND ${user.id} != ${id}`,
      columns: { id: true },
    });
    if (usernameConflict) {
      return { error: `Username "@${username}" déjà pris.` };
    }
  }

  const roleChanged = existing.role !== role;
  const emailChanged = existing.email.toLowerCase() !== email;
  const nameChanged = existing.name !== safeName;

  await db.transaction(async (tx) => {
    await tx
      .update(user)
      .set({
        name: safeName,
        email,
        username: username || null,
        role,
        emailVerified,
        updatedAt: new Date(),
      })
      .where(eq(user.id, id));

    // Audit log "update" : on snapshot le diff utile (name/email/role)
    // pour que la lecture montre quoi a changé sans avoir à recouper
    // un autre log. Skip l'insert si rien d'audit-able n'a bougé (ex :
    // l'admin a juste re-saved sans change).
    if (roleChanged || emailChanged || nameChanged) {
      await tx.insert(auditLog).values({
        actorUserId: session.user.id,
        action: ADMIN_AUDIT.USER_ADMIN_UPDATED,
        payload: JSON.stringify({
          targetUserId: id,
          before: { name: existing.name, email: existing.email, role: existing.role },
          after: { name: safeName, email, role },
        }),
      });
    }
    if (roleChanged) {
      await tx.insert(auditLog).values({
        actorUserId: session.user.id,
        action:
          role === "admin"
            ? ADMIN_AUDIT.USER_ADMIN_ROLE_PROMOTED
            : ADMIN_AUDIT.USER_ADMIN_ROLE_DEMOTED,
        payload: JSON.stringify({
          targetUserId: id,
          email,
          previousRole: existing.role,
          newRole: role,
        }),
      });
    }
  });

  revalidatePath("/admin/users");
  return { ok: `User "${safeName}" mis à jour.` };
}

function pickFirstError(err: z.ZodError): string {
  const flat = err.flatten();
  return Object.values(flat.fieldErrors).flat()[0] ?? "Données invalides.";
}
