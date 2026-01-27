"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { deleteEventAction, updateEventAction } from "@/app/actions";
import type { BaseHandlerParams } from "@/features/shared/types";
import type { PlanData } from "@/lib/types";

export function useEventHandlers({
  slug,
  writeKey,
  setPlan,
  token,
}: BaseHandlerParams & { setPlan: (updater: (prev: PlanData) => PlanData) => void }) {
  const [, startTransition] = useTransition();
  const t = useTranslations("Translations");
  const tShared = useTranslations("EventDashboard.Shared");

  const handleDeleteEvent = async () => {
    try {
      const result = await deleteEventAction({ slug, key: writeKey, token: token ?? undefined });
      if (result.success) {
        toast.success(tShared("eventDeleted"));
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error(t("meal.errorDelete"));
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
        toast.success(tShared("eventUpdated"));
      } catch (error) {
        console.error("Failed to update event:", error);
        toast.error(tShared("eventUpdateError"));
      }
    });
  };

  return {
    handleDeleteEvent,
    handleUpdateEvent,
  };
}
