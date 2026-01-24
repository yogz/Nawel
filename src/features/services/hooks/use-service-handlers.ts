"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createServiceAction, updateServiceAction, deleteServiceAction } from "@/app/actions";
import type { PlanData } from "@/lib/types";
import type { ServiceHandlerParams } from "@/features/shared/types";
import { trackMealServiceAction } from "@/lib/analytics";

export function useServiceHandlers({
  plan,
  setPlan,
  slug,
  writeKey,
  readOnly,
  setSheet,
  token,
}: ServiceHandlerParams) {
  const [, startTransition] = useTransition();
  const t = useTranslations("Translations");

  const handleCreateService = (
    mealId: number,
    title: string,
    description?: string,
    adults?: number,
    children?: number,
    peopleCount?: number
  ) => {
    if (readOnly) {
      return;
    }
    startTransition(async () => {
      try {
        const created = await createServiceAction({
          mealId,
          title,
          description,
          adults,
          children,
          peopleCount,
          slug,
          key: writeKey,
          token: token ?? undefined,
        });
        setPlan((prev: PlanData) => ({
          ...prev,
          meals: prev.meals.map((m) =>
            m.id === mealId ? { ...m, services: [...m.services, { ...created, items: [] }] } : m
          ),
        }));
        setSheet(null);
        toast.success("Service ajouté ! ✓");
        trackMealServiceAction("service_created", title);
      } catch (error) {
        console.error("Failed to create service:", error);
        toast.error(t("service.errorAdd"));
      }
    });
  };

  const handleUpdateService = (
    id: number,
    title?: string,
    description?: string,
    adults?: number,
    children?: number,
    peopleCount?: number,
    closeSheet = false
  ) => {
    if (readOnly) {
      return;
    }
    startTransition(async () => {
      try {
        await updateServiceAction({
          id,
          title,
          description,
          adults,
          children,
          peopleCount,
          slug,
          key: writeKey,
          token: token ?? undefined,
        });

        setPlan((prev: PlanData) => ({
          ...prev,
          meals: prev.meals.map((m) => ({
            ...m,
            services: m.services.map((s) => {
              if (s.id !== id) {
                return s;
              }

              return {
                ...s,
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(adults !== undefined && { adults }),
                ...(children !== undefined && { children }),
                ...(peopleCount !== undefined && { peopleCount }),
              };
            }),
          })),
        }));
        if (closeSheet) {
          setSheet(null);
        }
        toast.success("Service mis à jour ✓");
        trackMealServiceAction("service_updated", title);
      } catch (error) {
        console.error("Failed to update service:", error);
        toast.error(t("service.errorUpdate"));
      }
    });
  };

  const handleDeleteService = (id: number) => {
    if (readOnly) {
      return;
    }
    // Find service title before deletion for tracking
    let serviceTitle: string | undefined;
    for (const meal of plan.meals) {
      const service = meal.services.find((s) => s.id === id);
      if (service) {
        serviceTitle = service.title;
        break;
      }
    }
    const previousPlan = plan;
    setPlan((prev: PlanData) => ({
      ...prev,
      meals: prev.meals.map((m) => ({
        ...m,
        services: m.services.filter((s) => s.id !== id),
      })),
    }));
    setSheet(null);
    toast.success("Service supprimé ✓");
    trackMealServiceAction("service_deleted", serviceTitle);

    startTransition(async () => {
      try {
        await deleteServiceAction({ id, slug, key: writeKey, token: token ?? undefined });
      } catch (error) {
        console.error("Failed to delete service:", error);
        setPlan(previousPlan);
        toast.error(t("service.errorDelete"));
      }
    });
  };

  return {
    handleCreateService,
    handleUpdateService,
    handleDeleteService,
  };
}
