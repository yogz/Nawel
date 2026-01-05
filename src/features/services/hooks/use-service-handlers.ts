"use client";

import { useTransition } from "react";
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
  setSuccessMessage,
}: ServiceHandlerParams) {
  const [, startTransition] = useTransition();

  const handleCreateService = (
    mealId: number,
    title: string,
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
          adults,
          children,
          peopleCount,
          slug,
          key: writeKey,
        });
        setPlan((prev: PlanData) => ({
          ...prev,
          meals: prev.meals.map((m) =>
            m.id === mealId ? { ...m, services: [...m.services, { ...created, items: [] }] } : m
          ),
        }));
        setSheet(null);
        setSuccessMessage({ text: "Service ajouté ! ✓", type: "success" });
        trackMealServiceAction("service_created", title);
      } catch (error) {
        console.error("Failed to create service:", error);
        setSuccessMessage({ text: "Erreur lors de l'ajout ❌", type: "error" });
      }
    });
  };

  const handleUpdateService = (
    id: number,
    title?: string,
    adults?: number,
    children?: number,
    peopleCount?: number
  ) => {
    if (readOnly) {
      return;
    }
    startTransition(async () => {
      try {
        await updateServiceAction({
          id,
          title,
          adults,
          children,
          peopleCount,
          slug,
          key: writeKey,
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
                ...(adults !== undefined && { adults }),
                ...(children !== undefined && { children }),
                ...(peopleCount !== undefined && { peopleCount }),
              };
            }),
          })),
        }));
        setSheet(null);
        setSuccessMessage({ text: "Service mis à jour ✓", type: "success" });
        trackMealServiceAction("service_updated", title);
      } catch (error) {
        console.error("Failed to update service:", error);
        setSuccessMessage({ text: "Erreur lors de la mise à jour ❌", type: "error" });
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
    setSuccessMessage({ text: "Service supprimé ✓", type: "success" });
    trackMealServiceAction("service_deleted", serviceTitle);

    startTransition(async () => {
      try {
        await deleteServiceAction({ id, slug, key: writeKey });
      } catch (error) {
        console.error("Failed to delete service:", error);
        setPlan(previousPlan);
        setSuccessMessage({ text: "Erreur lors de la suppression ❌", type: "error" });
      }
    });
  };

  return {
    handleCreateService,
    handleUpdateService,
    handleDeleteService,
  };
}
