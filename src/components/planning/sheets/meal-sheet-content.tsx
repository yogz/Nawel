"use client";

import { useMemo } from "react";
import { MealForm } from "@/features/meals/components/meal-form";
import type { PlanData, Sheet, Meal } from "@/lib/types";

interface MealEditSheetContentProps {
  sheet: Extract<Sheet, { type: "meal-edit" }>;
  setSheet: (sheet: Sheet | null) => void;
  handleUpdateMeal: (
    id: number,
    date: string,
    title?: string,
    adults?: number,
    children?: number,
    time?: string,
    address?: string
  ) => void;
  handleDeleteMeal: (meal: Meal) => void;
}

export function MealEditSheetContent({
  sheet,
  setSheet,
  handleUpdateMeal,
  handleDeleteMeal,
}: MealEditSheetContentProps) {
  return (
    <MealForm
      meal={sheet.meal}
      onSubmit={(
        date: string,
        title?: string,
        _servs?: string[],
        adults?: number,
        children?: number,
        time?: string,
        address?: string
      ) => handleUpdateMeal(sheet.meal.id, date, title, adults, children, time, address)}
      onDelete={handleDeleteMeal}
      onClose={() => setSheet(null)}
    />
  );
}

interface MealCreateSheetContentProps {
  sheet: Extract<Sheet, { type: "meal-create" }>;
  setSheet: (sheet: Sheet | null) => void;
  plan: PlanData;
  handleCreateMealWithServices: (
    date: string,
    title?: string,
    services?: string[],
    adults?: number,
    children?: number,
    time?: string,
    address?: string
  ) => void;
}

export function MealCreateSheetContent({
  setSheet,
  plan,
  handleCreateMealWithServices,
}: MealCreateSheetContentProps) {
  const mealDefaults = useMemo(() => {
    const lastMeal = plan.meals.length > 0 ? plan.meals[plan.meals.length - 1] : null;
    const today = new Date().toISOString().split("T")[0];
    return {
      adults: plan.event?.adults ?? 0,
      children: plan.event?.children ?? 0,
      date: today,
      address: lastMeal?.address || undefined,
    };
  }, [plan.meals, plan.event]);

  return (
    <MealForm
      defaultAdults={mealDefaults.adults}
      defaultChildren={mealDefaults.children}
      defaultDate={mealDefaults.date}
      defaultAddress={mealDefaults.address}
      onSubmit={(
        date: string,
        title?: string,
        services?: string[],
        adults?: number,
        children?: number,
        time?: string,
        address?: string
      ) => handleCreateMealWithServices(date, title, services, adults, children, time, address)}
      onClose={() => setSheet(null)}
    />
  );
}
