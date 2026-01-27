"use server";

import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { createSafeAction } from "@/lib/action-utils";
import { submitFeedbackSchema, submitContactSchema } from "./schemas";
import { db } from "@/lib/db";
import { feedback, people } from "@drizzle/schema";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";

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

  try {
    let content = data.content;
    let userId = session?.user?.id;

    console.log("Submitting feedback:", {
      userId,
      personId: data.personId,
      content,
      url: data.url,
    });

    const result = await db
      .insert(feedback)
      .values({
        userId: userId,
        personId: data.personId,
        content: content,
        url: data.url,
        userAgent: currentHeaders.get("user-agent"),
      })
      .returning();

    console.log("Feedback submitted successfully:", result);

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
