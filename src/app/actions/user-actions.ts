"use server";

import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { createSafeAction } from "@/lib/action-utils";
import { updateUserSchema } from "./schemas";
import { revalidatePath } from "next/cache";

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
    // 1. Update basic info (name, image)
    await auth.api.updateUser({
      headers: currentHeaders,
      body: {
        name: data.name,
        image: data.image || undefined,
      },
    });

    // 2. Update email if it has changed
    // BetterAuth will handle the verification process depending on the configuration.
    if (data.email.toLowerCase() !== session.user.email.toLowerCase()) {
      await auth.api.changeEmail({
        headers: currentHeaders,
        body: {
          newEmail: data.email,
        },
      });
    }

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    // Map BetterAuth errors to user-friendly messages if needed
    if (error.message?.includes("email") && error.message?.includes("exists")) {
      throw new Error("Cette adresse email est déjà utilisée par un autre compte.");
    }
    throw error;
  }
});
