"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteEventAction } from "@/app/actions";
import type { BaseHandlerParams } from "@/features/shared/types";

export function useEventHandlers({ setSuccessMessage, slug, writeKey }: BaseHandlerParams) {
  const [, _startTransition] = useTransition();
  const t = useTranslations("Translations");
  const tShared = useTranslations("EventDashboard.Shared");

  const handleDeleteEvent = async () => {
    try {
      const result = await deleteEventAction({ slug, key: writeKey });
      if (result.success) {
        setSuccessMessage({ text: tShared("eventDeleted"), type: "success" });
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
      setSuccessMessage({ text: t("meal.errorDelete"), type: "error" });
    }
  };

  return {
    handleDeleteEvent,
  };
}
