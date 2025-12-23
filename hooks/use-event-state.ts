"use client";

import { useState, useTransition, useMemo } from "react";
import { PlanData, PlanningFilter, Item } from "@/lib/types";

export type SheetState =
    | { type: "item"; mealId: number; item?: Item }
    | { type: "meal"; dayId: number }
    | { type: "meal-edit"; meal: any }
    | { type: "day-edit"; day: any }
    | { type: "person" }
    | { type: "person-select" }
    | { type: "person-edit"; person: any } // Adjusted to matched used types
    | { type: "share" };

export function useEventState(initialPlan: PlanData, writeEnabled: boolean) {
    const [plan, setPlan] = useState(initialPlan);
    const [tab, setTab] = useState<"planning" | "people" | "settings">("planning");
    const [logs, setLogs] = useState<any[]>([]);
    const [planningFilter, setPlanningFilter] = useState<PlanningFilter>({ type: "all" });
    const [sheet, setSheet] = useState<SheetState | null>(null);
    const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
    const [readOnly, setReadOnly] = useState(!writeEnabled);
    const [pending, startTransition] = useTransition();
    const [activeItemId, setActiveItemId] = useState<number | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [logsLoading, setLogsLoading] = useState(false);

    const unassignedItemsCount = useMemo(() => {
        let count = 0;
        plan.days.forEach((day) => {
            day.meals.forEach((meal) => {
                meal.items.forEach((item) => {
                    if (!item.personId) count++;
                });
            });
        });
        return count;
    }, [plan.days]);

    return {
        plan, setPlan,
        tab, setTab,
        logs, setLogs,
        planningFilter, setPlanningFilter,
        sheet, setSheet,
        selectedPerson, setSelectedPerson,
        readOnly, setReadOnly,
        pending, startTransition,
        activeItemId, setActiveItemId,
        successMessage, setSuccessMessage,
        logsLoading, setLogsLoading,
        unassignedItemsCount
    };
}
