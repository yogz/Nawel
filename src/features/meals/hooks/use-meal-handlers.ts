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
    children?: number,
    time?: string,
    address?: string
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
        time,
        address,
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
    children?: number,
    time?: string,
    address?: string
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
          time,
          address,
        });
        setPlan((prev: PlanData) => ({
          ...prev,
          meals: [...prev.meals, created].sort((a, b) => a.date.localeCompare(b.date)),
        }));
        setSheet(null);
        setSuccessMessage({ text: "Repas ajouté ✨", type: "success" });
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
    children?: number,
    time?: string,
    address?: string
  ) => {
    if (readOnly) {
      return;
    }
    startTransition(async () => {
      try {
        await updateMealAction({
          id,
          date,
          title,
          slug,
          key: writeKey,
          adults,
          children,
          time,
          address,
        });

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
              time: time ?? m.time,
              address: address ?? m.address,
            };

            // Cascade to services removed to respect "initialization only" propagation rule.
            // Future adjustments to service guests should be made at the service level.

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
