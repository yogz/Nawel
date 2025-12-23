"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus, Pencil } from "lucide-react";
import { Item, Meal, Person, PlanningFilter } from "@/lib/types";
import { ItemRow } from "./item-row";
import clsx from "clsx";

export function MealSection({
  meal,
  people,
  onAssign,
  onDelete,
  onCreate,
  onEdit,
  readOnly,
  filter = { type: "all" },
  activeItemId,
}: {
  meal: Meal;
  people: Person[];
  onAssign: (item: Item) => void;
  onDelete: (item: Item) => void;
  onCreate: () => void;
  onEdit: () => void;
  readOnly?: boolean;
  filter?: PlanningFilter;
  activeItemId?: number | null;
}) {
  const filteredItems = useMemo(() => {
    if (filter.type === "unassigned") return meal.items.filter((i) => !i.personId);
    if (filter.type === "person") return meal.items.filter((i) => i.personId === filter.personId);
    return meal.items;
  }, [meal.items, filter]);

  const { setNodeRef, isOver } = useDroppable({
    id: `meal-${meal.id}`,
  });

  if (filter.type !== "all" && filteredItems.length === 0) return null;

  const isDraggingFromOtherMeal = activeItemId !== null && activeItemId !== undefined && !meal.items.some((i) => i.id === activeItemId);

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "premium-card glass p-3 sm:p-6 overflow-hidden transition-all",
        isOver && isDraggingFromOtherMeal && "ring-2 ring-accent ring-offset-2 bg-accent/5"
      )}
    >
      <div className="mb-2 sm:mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{meal.title}</h3>
          {!readOnly && (
            <button
              onClick={onEdit}
              className="text-gray-300 hover:text-accent transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {!readOnly && filter.type === "all" && (
          <button
            onClick={onCreate}
            className="flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white shadow-sm active:scale-95"
          >
            <Plus size={16} />
            Ajouter
          </button>
        )}
      </div>
      {filteredItems.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          person={people.find((p) => p.id === item.personId) || item.person}
          onAssign={() => onAssign(item)}
          onDelete={() => onDelete(item)}
          readOnly={readOnly}
          allPeopleNames={people.map(p => p.name)}
        />
      ))}
      {meal.items.length === 0 && (
        <p className={clsx("text-sm text-gray-500", isOver && isDraggingFromOtherMeal && "text-accent font-semibold")}>
          {isOver && isDraggingFromOtherMeal ? "Déposez ici pour déplacer l'article" : "Aucun ingrédient pour l'instant."}
        </p>
      )}
    </section>
  );
}
