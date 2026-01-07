"use server";

import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { createSafeAction } from "@/lib/action-utils";
import { submitFeedbackSchema } from "./schemas";
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
