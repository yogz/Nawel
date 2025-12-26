"use client";

import { useTransition } from "react";
import {
  createMealAction,
  updateMealAction,
  deleteMealAction,
  createMealWithServicesAction,
} from "@/app/actions";
import type { PlanData } from "@/lib/types";
import type { MealHandlerParams } from "@/features/shared/types";

export function useMealHandlers({
  plan,
  setPlan,
  slug,
  writeKey,
  readOnly,
  setSheet,
  setSuccessMessage,
}: MealHandlerParams) {
  const [, startTransition] = useTransition();

  const handleCreateMeal = async (
    date: string,
    title?: string,
    adults?: number,
    children?: number
  ): Promise<number> => {
    if (readOnly) {
      return 0;
    }
    try {
      const created = await createMealAction({
        date,
        title,
        slug,
        key: writeKey,
        adults,
        children,
      });
      setPlan((prev: PlanData) => ({
        ...prev,
        meals: [...prev.meals, { ...created, services: [] }].sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
      }));
      setSuccessMessage({ text: "Repas ajouté ✨", type: "success" });
      return created.id;
    } catch (error) {
      console.error("Failed to create meal:", error);
      setSuccessMessage({ text: "Erreur lors de la création ❌", type: "error" });
      return 0;
    }
  };

  const handleCreateMealWithServices = (
    date: string,
    title?: string,
    services: string[] = [],
    adults?: number,
    children?: number
  ) => {
    if (readOnly) {
      return;
    }
    startTransition(async () => {
      try {
        const created = await createMealWithServicesAction({
          date,
          title,
          services,
          slug,
          key: writeKey,
          adults,
          children,
        });
        setPlan((prev: PlanData) => ({
          ...prev,
          meals: [...prev.meals, created].sort((a, b) => a.date.localeCompare(b.date)),
        }));
        setSheet(null);
        setSuccessMessage({ text: "Nouveau repas créé ✨", type: "success" });
      } catch (error) {
        console.error("Failed to create meal with services:", error);
        setSuccessMessage({ text: "Erreur lors de la création ❌", type: "error" });
      }
    });
  };

  const handleUpdateMeal = (
    id: number,
    date: string,
    title?: string | null,
    adults?: number,
    children?: number
  ) => {
    if (readOnly) {
      return;
    }
    startTransition(async () => {
      try {
        await updateMealAction({ id, date, title, slug, key: writeKey, adults, children });

        const { scaleQuantity } = await import("@/lib/utils");

        setPlan((prev: PlanData) => ({
          ...prev,
          meals: prev.meals.map((m) => {
            if (m.id !== id) return m;

            const oldTotal = m.adults + m.children;
            const newAdults = adults ?? m.adults;
            const newChildren = children ?? m.children;
            const newTotal = newAdults + newChildren;

            const updatedMeal = {
              ...m,
              date,
              title: title ?? null,
              adults: newAdults,
              children: newChildren,
            };

            // Cascade to services if total changed
            if (newTotal !== oldTotal && oldTotal > 0) {
              updatedMeal.services = m.services.map((s) => ({
                ...s,
                peopleCount: newTotal,
                items: s.items.map((item) => ({
                  ...item,
                  quantity: scaleQuantity(item.quantity, s.peopleCount, newTotal),
                  ingredients: item.ingredients?.map((ing) => ({
                    ...ing,
                    quantity: scaleQuantity(ing.quantity, s.peopleCount, newTotal),
                  })),
                })),
              }));
            } else if (newTotal !== oldTotal && oldTotal === 0) {
              // Handle case where old total was 0 (should use current service peopleCount as base if possible,
              // but if it's 0 too, just set to newTotal)
              updatedMeal.services = m.services.map((s) => ({
                ...s,
                peopleCount: newTotal,
                // If s.peopleCount was 0 or 1, scaling is ambiguous.
                // Usually we just update the count.
              }));
            }

            return updatedMeal;
          }),
        }));
        setSheet(null);
        setSuccessMessage({ text: "Repas mis à jour ✓", type: "success" });
      } catch (error) {
        console.error("Failed to update meal:", error);
        setSuccessMessage({ text: "Erreur lors de la mise à jour ❌", type: "error" });
      }
    });
  };

  const handleDeleteMeal = (id: number) => {
    if (readOnly) {
      return;
    }
    const previousPlan = plan;
    setPlan((prev: PlanData) => ({
      ...prev,
      meals: prev.meals.filter((m) => m.id !== id),
    }));
    setSheet(null);
    setSuccessMessage({ text: "Repas supprimé ✓", type: "success" });
    startTransition(async () => {
      try {
        await deleteMealAction({ id, slug, key: writeKey });
      } catch (error) {
        console.error("Failed to delete meal:", error);
        setPlan(previousPlan);
        setSuccessMessage({ text: "Erreur lors de la suppression ❌", type: "error" });
      }
    });
  };

  return {
    handleCreateMeal,
    handleCreateMealWithServices,
    handleUpdateMeal,
    handleDeleteMeal,
  };
}
