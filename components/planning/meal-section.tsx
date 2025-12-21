"use client";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { GripVertical, Plus } from "lucide-react";
import { Item, Meal, Person } from "@/lib/types";
import { SortableRow } from "./sortable-row";
import { ItemRow } from "./item-row";

export function MealSection({
  meal,
  people,
  onAssign,
  onDelete,
  onReorder,
  onCreate,
  readOnly,
  showOnlyUnassigned,
}: {
  meal: Meal;
  people: Person[];
  onAssign: (item: Item) => void;
  onDelete: (item: Item) => void;
  onReorder: (orderedIds: number[]) => void;
  onCreate: () => void;
  readOnly?: boolean;
  showOnlyUnassigned?: boolean;
}) {
  const filteredItems = showOnlyUnassigned ? meal.items.filter((i) => !i.personId) : meal.items;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = meal.items.findIndex((i) => i.id === Number(active.id));
      const newIndex = meal.items.findIndex((i) => i.id === Number(over.id));
      const newOrder = arrayMove(meal.items, oldIndex, newIndex).map((i) => i.id);
      onReorder(newOrder);
    }
  };

  if (showOnlyUnassigned && filteredItems.length === 0) return null;

  return (
    <section className="premium-card glass p-6 overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{meal.title}</h3>
        {!readOnly && !showOnlyUnassigned && (
          <button
            onClick={onCreate}
            className="flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white shadow-sm active:scale-95"
          >
            <Plus size={16} />
            Ajouter
          </button>
        )}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filteredItems.map((item) => item.id)}>
          {filteredItems.map((item) => (
            <SortableRow key={item.id} id={item.id}>
              {(attributes, listeners) => (
                <ItemRow
                  item={item}
                  person={people.find((p) => p.id === item.personId) || item.person}
                  onAssign={() => onAssign(item)}
                  onDelete={() => onDelete(item)}
                  readOnly={readOnly}
                  dragHandle={
                    <button
                      {...attributes}
                      {...listeners}
                      className="rounded-xl bg-gray-100 p-2 text-gray-500"
                      aria-label="Drag to reorder"
                      disabled={readOnly}
                    >
                      <GripVertical size={16} />
                    </button>
                  }
                />
              )}
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>
      {meal.items.length === 0 && <p className="text-sm text-gray-500">Aucun ingrédient pour l&apos;instant.</p>}
    </section>
  );
}
