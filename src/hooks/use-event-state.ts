"use client";

import { useState, useTransition, useMemo } from "react";
import type { PlanData, PlanningFilter, Sheet } from "@/lib/types";

export function useEventState(initialPlan: PlanData, writeEnabled: boolean) {
  const [plan, setPlan] = useState(initialPlan);
  const [tab, setTab] = useState<"planning" | "people" | "shopping">("planning");
  const [planningFilter, setPlanningFilter] = useState<PlanningFilter>({ type: "all" });
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
  const [readOnly, setReadOnly] = useState(!writeEnabled);
  const [pending, startTransition] = useTransition();
  const [activeItemId, setActiveItemId] = useState<number | null>(null);

  // Compute count of unassigned items
  const unassignedItemsCount = useMemo(() => {
    return plan.meals.reduce((count, meal) => {
      return (
        count +
        meal.services.reduce((sCount, service) => {
          return sCount + service.items.filter((item) => !item.personId).length;
        }, 0)
      );
    }, 0);
  }, [plan.meals]);

  return {
    plan,
    setPlan,
    tab,
    setTab,
    planningFilter,
    setPlanningFilter,
    sheet,
    setSheet,
    selectedPerson,
    setSelectedPerson,
    readOnly,
    setReadOnly,
    pending,
    startTransition,
    activeItemId,
    setActiveItemId,
    unassignedItemsCount,
  };
}
