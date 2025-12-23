"use client";

import { DndContext, closestCenter, DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { MealSection } from "./meal-section";
import { CitationDisplay } from "../common/citation-display";
import { PlusIcon, Pencil } from "lucide-react";

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
    onCreateMeal,
    setSheet
}: any) {
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <div className="space-y-12">
                {plan.days.map((day: any) => {
                    const hasMatch = day.meals.some((m: any) => m.items.some((i: any) => {
                        if (planningFilter.type === "all") return true;
                        if (planningFilter.type === "unassigned") return !i.personId;
                        if (planningFilter.type === "person") return i.personId === planningFilter.personId;
                        return false;
                    }));
                    if (planningFilter.type !== "all" && !hasMatch) return null;

                    return (
                        <div key={day.id} className="space-y-6">
                            <div className="flex items-center gap-3 px-2">
                                <div className="h-10 w-10 shrink-0 grid place-items-center rounded-2xl bg-accent text-white shadow-lg ring-4 ring-accent/10">
                                    <span className="text-lg font-bold">🎄</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-black tracking-tight text-text">
                                        {day.title || day.date}
                                    </h2>
                                    {!readOnly && (
                                        <button
                                            onClick={() => setSheet({ type: "day-edit", day })}
                                            className="text-accent/40 hover:text-accent transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <CitationDisplay />
                            </div>
                            <div className="space-y-6">
                                {day.meals.map((meal: any) => (
                                    <MealSection
                                        key={meal.id}
                                        meal={meal}
                                        people={plan.people}
                                        readOnly={readOnly}
                                        onAssign={(item: any) => onAssign(item, meal.id)}
                                        onDelete={onDelete}
                                        onCreate={() => onCreateItem(meal.id)}
                                        onEdit={() => setSheet({ type: "meal-edit", meal })}
                                        filter={planningFilter}
                                        activeItemId={activeItemId}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
            {plan.days.length === 0 && planningFilter.type === "all" && (
                <div className="px-4 py-8 text-center">
                    <p className="text-gray-500 mb-4">Aucun jour pour l&apos;instant.</p>
                    {!readOnly && (
                        <button
                            onClick={() => setSheet({ type: "meal", dayId: -1 })}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white/50 px-4 py-4 text-sm font-semibold text-gray-600 hover:bg-white/80 transition-colors"
                        >
                            <PlusIcon />
                            Créer un jour et un repas
                        </button>
                    )}
                </div>
            )}
            {!readOnly && planningFilter.type === "all" && plan.days.length > 0 && (
                <div className="mt-8 px-4">
                    <button
                        onClick={() => onCreateMeal(plan.days[0]?.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white/50 px-4 py-4 text-sm font-semibold text-gray-600 hover:bg-white/80 transition-colors"
                    >
                        <PlusIcon />
                        Ajouter un repas
                    </button>
                </div>
            )}
        </DndContext>
    );
}
