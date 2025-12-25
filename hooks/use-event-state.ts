"use client";

import { useState, useTransition, useMemo } from "react";
import { PlanData, PlanningFilter, Item } from "@/lib/types";

export type SheetState =
    | { type: "item"; serviceId: number; item?: Item }
    | { type: "service"; mealId: number }
    | { type: "service-edit"; service: any }
    | { type: "meal-edit"; meal: any }
    | { type: "person" }
    | { type: "person-select" }
    | { type: "person-edit"; person: any }
    | { type: "share" }
    | { type: "meal-create" };

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
    const [successMessage, setSuccessMessage] = useState<{ text: string; type?: "success" | "error" } | null>(null);
    const [logsLoading, setLogsLoading] = useState(false);

    const unassignedItemsCount = useMemo(() => {
        let count = 0;
        plan.meals.forEach((meal) => {
            meal.services.forEach((service) => {
                service.items.forEach((item) => {
                    if (!item.personId) count++;
                });
            });
        });
        return count;
    }, [plan.meals]);

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
