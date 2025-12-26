"use client";

import { useTransition } from "react";
import { createServiceAction, updateServiceAction, deleteServiceAction } from "@/app/actions";
import type { PlanData } from "@/lib/types";
import type { ServiceHandlerParams } from "@/features/shared/types";

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

  const handleCreateService = (mealId: number, title: string, peopleCount?: number) => {
    if (readOnly) {
      return;
    }
    startTransition(async () => {
      try {
        const created = await createServiceAction({
          mealId,
          title,
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
      } catch (error) {
        console.error("Failed to create service:", error);
        setSuccessMessage({ text: "Erreur lors de l'ajout ❌", type: "error" });
      }
    });
  };

  const handleUpdateService = (id: number, title?: string, peopleCount?: number) => {
    if (readOnly) {
      return;
    }
    startTransition(async () => {
      try {
        await updateServiceAction({ id, title, peopleCount, slug, key: writeKey });
        setPlan((prev: PlanData) => ({
          ...prev,
          meals: prev.meals.map((m) => ({
            ...m,
            services: m.services.map((s) =>
              s.id === id
                ? {
                    ...s,
                    ...(title !== undefined && { title }),
                    ...(peopleCount !== undefined && { peopleCount }),
                  }
                : s
            ),
          })),
        }));
        setSheet(null);
        setSuccessMessage({ text: "Service mis à jour ✓", type: "success" });
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
