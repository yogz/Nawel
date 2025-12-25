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

  const handleCreateMeal = async (date: string, title?: string): Promise<number> => {
    if (readOnly) {
      return 0;
    }
    try {
      const created = await createMealAction({ date, title, slug, key: writeKey });
      setPlan((prev: PlanData) => ({
        ...prev,
        meals: [...prev.meals, { ...created, services: [] }].sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
      }));
      setSuccessMessage({ text: "Repas ajouté ✨", type: "success" });
      setTimeout(() => setSuccessMessage(null), 3000);
      return created.id;
    } catch (error) {
      console.error("Failed to create meal:", error);
      setSuccessMessage({ text: "Erreur lors de la création ❌", type: "error" });
      setTimeout(() => setSuccessMessage(null), 3000);
      return 0;
    }
  };

  const handleCreateMealWithServices = (
    date: string,
    title: string | undefined,
    services: string[]
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
        });
        setPlan((prev: PlanData) => ({
          ...prev,
          meals: [...prev.meals, created].sort((a, b) => a.date.localeCompare(b.date)),
        }));
        setSheet(null);
        setSuccessMessage({ text: "Nouveau repas créé ✨", type: "success" });
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        console.error("Failed to create meal with services:", error);
        setSuccessMessage({ text: "Erreur lors de la création ❌", type: "error" });
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    });
  };

  const handleUpdateMeal = (id: number, date: string, title?: string | null) => {
    if (readOnly) {
      return;
    }
    startTransition(async () => {
      try {
        await updateMealAction({ id, date, title, slug, key: writeKey });
        setPlan((prev: PlanData) => ({
          ...prev,
          meals: prev.meals.map((m) => (m.id === id ? { ...m, date, title: title ?? null } : m)),
        }));
        setSheet(null);
        setSuccessMessage({ text: "Repas mis à jour ✓", type: "success" });
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        console.error("Failed to update meal:", error);
        setSuccessMessage({ text: "Erreur lors de la mise à jour ❌", type: "error" });
        setTimeout(() => setSuccessMessage(null), 3000);
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
    setTimeout(() => setSuccessMessage(null), 3000);
    startTransition(async () => {
      try {
        await deleteMealAction({ id, slug, key: writeKey });
      } catch (error) {
        console.error("Failed to delete meal:", error);
        setPlan(previousPlan);
        setSuccessMessage({ text: "Erreur lors de la suppression ❌", type: "error" });
        setTimeout(() => setSuccessMessage(null), 3000);
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
