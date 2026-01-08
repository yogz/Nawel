"use server";

import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { createSafeAction } from "@/lib/action-utils";
import { submitFeedbackSchema, submitContactSchema } from "./schemas";
import { db } from "@/lib/db";
import { feedback } from "@drizzle/schema";
import { getTranslations } from "next-intl/server";

/**
 * Submits user feedback or bug report.
 * Identified users only.
 */
export const submitFeedbackAction = createSafeAction(submitFeedbackSchema, async (data) => {
  const currentHeaders = await headers();
  const session = await auth.api.getSession({
    headers: currentHeaders,
  });

  const t = await getTranslations({
    locale: session?.user?.language || "fr",
    namespace: "Translations",
  });

  if (!session) {
    throw new Error(t("actions.notLoggedInProfile")); // Generic unauthorized message
  }

  try {
    await db.insert(feedback).values({
      userId: session.user.id,
      content: data.content,
      url: data.url,
      userAgent: currentHeaders.get("user-agent"),
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Submit feedback error:", error);
    throw new Error(t("actions.errorSubmitFeedback"));
  }
});

/**
 * Submits contact form.
 * Publicly accessible.
 */
export const submitContactAction = createSafeAction(submitContactSchema, async (data) => {
  const currentHeaders = await headers();

  try {
    await db.insert(feedback).values({
      content: data.content,
      email: data.email,
      url: data.url,
      userAgent: currentHeaders.get("user-agent"),
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Submit contact error:", error);
    // Use fallback if email column doesn't exist yet
    try {
      await db.insert(feedback).values({
        content: `[Email: ${data.email}] ${data.content}`,
        url: data.url,
        userAgent: currentHeaders.get("user-agent"),
      });
      return { success: true };
    } catch (innerError) {
      console.error("Submit contact fallback error:", innerError);
      throw new Error("Could not submit contact form");
    }
  }
});
