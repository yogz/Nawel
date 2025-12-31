"use server";

import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { createSafeAction } from "@/lib/action-utils";
import { updateUserSchema, deleteUserSchema } from "./schemas";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { events, user } from "@drizzle/schema";
import { eq } from "drizzle-orm";
import { getPostHogClient } from "@/lib/posthog-server";

/**
 * Updates the current user's profile information.
 * Follows PROJECT_STANDARDS: uses createSafeAction and revalidatePath.
 */
export const updateUserAction = createSafeAction(updateUserSchema, async (data) => {
  const currentHeaders = await headers();
  const session = await auth.api.getSession({
    headers: currentHeaders,
  });

  if (!session) {
    throw new Error("Vous devez être connecté pour modifier votre profil.");
  }

  try {
    // Update the user profile.
    // Note: BetterAuth API updateUser body.emoji doesn't like null (types say string | undefined).
    // So we update the name/language via API and the emoji via DB to allow resetting to null.
    await auth.api.updateUser({
      headers: currentHeaders,
      body: {
        name: data.name,
        language: data.language,
      },
    });

    if (data.emoji !== undefined) {
      await db.update(user).set({ emoji: data.emoji }).where(eq(user.id, session.user.id));
    }

    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    throw error;
  }
});

/**
 * Permanently deletes the user account and all associated events.
 */
export const deleteUserAction = createSafeAction(deleteUserSchema, async (data) => {
  const currentHeaders = await headers();
  const session = await auth.api.getSession({
    headers: currentHeaders,
  });

  if (!session) {
    throw new Error("Vous devez être connecté pour supprimer votre compte.");
  }

  if (!data.confirm) {
    throw new Error("La confirmation est requise.");
  }

  try {
    // Track account deletion - churn indicator for retention analysis (before deletion)
    const posthog = getPostHogClient();
    if (posthog) {
      posthog.capture({
        distinctId: session.user.id,
        event: "user_deleted_account",
        properties: {
          user_email: session.user.email,
          user_name: session.user.name,
        },
      });
    }

    // 1. Delete all events owned by this user
    await db.delete(events).where(eq(events.ownerId, session.user.id));

    // 2. Delete the user account via BetterAuth
    // This will also invalidate sessions and delete accounts linked to this user.
    await auth.api.deleteUser({
      headers: currentHeaders,
      body: {},
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    console.error("Delete user error:", error);
    throw new Error("Une erreur est survenue lors de la suppression de votre compte.");
  }
});
