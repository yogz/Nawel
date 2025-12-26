"use client";

import { useState, useTransition, useMemo } from "react";
import type { PlanData, PlanningFilter, Item, Service, Meal, Person } from "@/lib/types";

export interface ChangeLog {
  id: number;
  action: string;
  tableName: string;
  recordId: number;
  oldData: { name?: string; title?: string } | null;
  newData: { name?: string; title?: string } | null;
  userIp: string | null;
  userAgent: string | null;
  referer: string | null;
  createdAt: Date;
}

export type SheetState =
  | { type: "item"; serviceId: number; item?: Item }
  | { type: "service"; mealId: number }
  | { type: "service-edit"; service: Service }
  | { type: "meal-edit"; meal: Meal }
  | { type: "person" }
  | { type: "person-select" }
  | { type: "person-edit"; person: Person }
  | { type: "share" }
  | { type: "meal-create" };

export function useEventState(initialPlan: PlanData, writeEnabled: boolean) {
  const [plan, setPlan] = useState(initialPlan);
  const [tab, setTab] = useState<"planning" | "people" | "settings">("planning");
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [planningFilter, setPlanningFilter] = useState<PlanningFilter>({ type: "all" });
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
  const [readOnly, setReadOnly] = useState(!writeEnabled);
  const [pending, startTransition] = useTransition();
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<{
    text: string;
    type?: "success" | "error";
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  const unassignedItemsCount = useMemo(() => {
    let count = 0;
    plan.meals.forEach((meal) => {
      meal.services.forEach((service) => {
        service.items.forEach((item) => {
          if (!item.personId) {
            count++;
          }
        });
      });
    });
    return count;
  }, [plan.meals]);

  return {
    plan,
    setPlan,
    tab,
    setTab,
    logs,
    setLogs,
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
    successMessage,
    setSuccessMessage,
    logsLoading,
    setLogsLoading,
    unassignedItemsCount,
  };
}
