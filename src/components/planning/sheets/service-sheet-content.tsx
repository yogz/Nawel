"use client";

import { useMemo } from "react";
import { ServiceForm } from "@/features/services/components/service-form";
import { ServiceEditForm } from "@/features/services/components/service-edit-form";
import type { PlanData, Sheet, Service } from "@/lib/types";

interface ServiceSheetContentProps {
  sheet: Extract<Sheet, { type: "service" }>;
  plan: PlanData;
  readOnly?: boolean;
  handleCreateMeal: (
    date: string,
    title?: string,
    adults?: number,
    children?: number,
    time?: string,
    address?: string
  ) => Promise<number>;
  handleCreateService: (
    mealId: number,
    title: string,
    description?: string,
    adults?: number,
    children?: number,
    peopleCount?: number
  ) => void;
}

export function ServiceSheetContent({
  sheet,
  plan,
  readOnly,
  handleCreateMeal,
  handleCreateService,
}: ServiceSheetContentProps) {
  const serviceDefaults = useMemo(() => {
    if (sheet.mealId === -1) {
      return {
        adults: plan.event?.adults ?? 0,
        children: plan.event?.children ?? 0,
        peopleCount: (plan.event?.adults ?? 0) + (plan.event?.children ?? 0),
      };
    }
    const meal = plan.meals.find((m) => m.id === sheet.mealId);
    if (meal) {
      return {
        adults: meal.adults,
        children: meal.children,
        peopleCount: meal.adults + meal.children,
      };
    }
    return {
      adults: plan.event?.adults ?? 0,
      children: plan.event?.children ?? 0,
      peopleCount: (plan.event?.adults ?? 0) + (plan.event?.children ?? 0),
    };
  }, [sheet.mealId, plan.meals, plan.event]);

  return (
    <ServiceForm
      meals={plan.meals}
      defaultMealId={sheet.mealId}
      defaultAdults={serviceDefaults.adults}
      defaultChildren={serviceDefaults.children}
      defaultPeopleCount={serviceDefaults.peopleCount}
      forceNewMeal={sheet.mealId === -1}
      readOnly={readOnly}
      onSubmit={async (
        mealId: number,
        title: string,
        description: string,
        adults: number,
        children: number,
        peopleCount: number,
        newMealDate?: string,
        newMealTitle?: string,
        newMealTime?: string,
        newMealAddress?: string
      ) => {
        let targetMealId = mealId;
        if (mealId === -1 && newMealDate) {
          targetMealId = await handleCreateMeal(
            newMealDate,
            newMealTitle || undefined,
            undefined,
            undefined,
            newMealTime,
            newMealAddress
          );
        }
        handleCreateService(targetMealId, title, description, adults, children, peopleCount);
      }}
    />
  );
}

interface ServiceEditSheetContentProps {
  sheet: Extract<Sheet, { type: "service-edit" }>;
  setSheet: (sheet: Sheet | null) => void;
  handleUpdateService: (
    id: number,
    title: string,
    description?: string,
    adults?: number,
    children?: number,
    peopleCount?: number
  ) => void;
  handleDeleteService: (service: Service) => void;
}

export function ServiceEditSheetContent({
  sheet,
  setSheet,
  handleUpdateService,
  handleDeleteService,
}: ServiceEditSheetContentProps) {
  return (
    <ServiceEditForm
      service={sheet.service}
      onSubmit={handleUpdateService}
      onDelete={handleDeleteService}
      onClose={() => setSheet(null)}
    />
  );
}
