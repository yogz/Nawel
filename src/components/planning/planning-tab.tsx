"use client";

import { useState, useEffect } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { ServiceSection } from "./service-section";
import { CitationDisplay } from "../common/citation-display";
import { PlusIcon, Pencil } from "lucide-react";

import {
  type DragEndEvent,
  type DragStartEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import { type PlanData, type PlanningFilter, type Item, type Sheet } from "@/lib/types";

interface PlanningTabProps {
  plan: PlanData;
  planningFilter: PlanningFilter;
  activeItemId: number | null;
  readOnly?: boolean;
  sensors: SensorDescriptor<SensorOptions>[];
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onAssign: (item: Item, serviceId?: number) => void;
  onDelete: (item: Item) => void;
  onCreateItem: (serviceId: number) => void;
  onCreateService: (mealId: number) => void;
  setSheet: (sheet: Sheet) => void;
}

export function PlanningTab({
  plan,
  planningFilter,
  activeItemId,
  readOnly,
  sensors,
  onDragStart,
  onDragEnd,
  onAssign,
  onDelete,
  onCreateItem,
  onCreateService,
  setSheet,
}: PlanningTabProps) {
  const [hasMounted, setHasMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHasMounted(true), []);

  if (!hasMounted) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-12">
        {plan.meals.map((meal) => {
          const hasMatch = meal.services.some((s) =>
            s.items.some((i) => {
              if (planningFilter.type === "all") {
                return true;
              }
              if (planningFilter.type === "unassigned") {
                return !i.personId;
              }
              if (planningFilter.type === "person") {
                return i.personId === planningFilter.personId;
              }
              return false;
            })
          );
          if (planningFilter.type !== "all" && !hasMatch) {
            return null;
          }

          return (
            <div key={meal.id} className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent text-white shadow-lg ring-4 ring-accent/10">
                  <span className="text-lg font-bold">🎄</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-xl font-black tracking-tight text-text">
                      {meal.title || meal.date}
                    </h2>
                    {!readOnly && (
                      <button
                        onClick={() => setSheet({ type: "meal-edit", meal })}
                        className="shrink-0 text-accent/40 transition-colors hover:text-accent"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <CitationDisplay />
                </div>
              </div>
              <div className="space-y-6">
                {meal.services.map((service) => (
                  <ServiceSection
                    key={service.id}
                    service={service}
                    people={plan.people}
                    readOnly={readOnly}
                    onAssign={(item) => onAssign(item, service.id)}
                    onDelete={onDelete}
                    onCreate={() => onCreateItem(service.id)}
                    onEdit={() => setSheet({ type: "service-edit", service })}
                    filter={planningFilter}
                    activeItemId={activeItemId}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {plan.meals.length === 0 && planningFilter.type === "all" && (
        <div className="px-4 py-8 text-center">
          <p className="mb-4 text-gray-500">Aucun repas pour l&apos;instant.</p>
          {!readOnly && (
            <button
              onClick={() => setSheet({ type: "meal-create" })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent/20 bg-accent/5 px-4 py-4 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
            >
              <PlusIcon />
              Ajouter un repas
            </button>
          )}
        </div>
      )}
      {!readOnly && planningFilter.type === "all" && plan.meals.length > 0 && (
        <div className="mt-8 flex flex-col gap-3 px-4">
          <button
            onClick={() => onCreateService(plan.meals[0]?.id ?? -1)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white/50 px-4 py-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-white/80"
          >
            <PlusIcon />
            Ajouter un service
          </button>
          <button
            onClick={() => setSheet({ type: "meal-create" })}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent/20 bg-accent/5 px-4 py-4 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            <PlusIcon />
            Ajouter un repas
          </button>
        </div>
      )}
    </DndContext>
  );
}
