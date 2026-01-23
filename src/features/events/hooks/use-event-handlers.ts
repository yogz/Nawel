"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteEventAction, updateEventAction } from "@/app/actions";
import type { BaseHandlerParams } from "@/features/shared/types";

export function useEventHandlers({
  setSuccessMessage,
  slug,
  writeKey,
  setPlan,
  token,
}: BaseHandlerParams & { setPlan: (updater: (prev: any) => any) => void }) {
  const [, startTransition] = useTransition();
  const t = useTranslations("Translations");
  const tShared = useTranslations("EventDashboard.Shared");

  const handleDeleteEvent = async () => {
    try {
      const result = await deleteEventAction({ slug, key: writeKey, token: token ?? undefined });
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

  const handleUpdateEvent = (name: string) => {
    startTransition(async () => {
      try {
        await updateEventAction({
          slug,
          key: writeKey,
          name,
          token: token ?? undefined,
        });

        setPlan((prev) => ({
          ...prev,
          event: prev.event ? { ...prev.event, name } : null,
        }));
        setSuccessMessage({ text: tShared("eventUpdated"), type: "success" });
      } catch (error) {
        console.error("Failed to update event:", error);
        setSuccessMessage({ text: tShared("eventUpdateError"), type: "error" });
      }
    });
  };

  return {
    handleDeleteEvent,
    handleUpdateEvent,
  };
}
