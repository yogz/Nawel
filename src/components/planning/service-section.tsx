"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus, Pencil } from "lucide-react";
import { type Item, type Service, type Person, type PlanningFilter } from "@/lib/types";
import { ItemRow } from "./item-row";
import clsx from "clsx";

export function ServiceSection({
  service,
  people,
  onAssign,
  onDelete,
  onCreate,
  onEdit,
  readOnly,
  filter = { type: "all" },
  activeItemId,
}: {
  service: Service;
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
    if (filter.type === "unassigned") {
      return service.items.filter((i) => !i.personId);
    }
    if (filter.type === "person") {
      return service.items.filter((i) => i.personId === filter.personId);
    }
    return service.items;
  }, [service.items, filter]);

  const { setNodeRef, isOver } = useDroppable({
    id: `service-${service.id}`,
  });

  if (filter.type !== "all" && filteredItems.length === 0) {
    return null;
  }

  const isDraggingFromOtherService =
    activeItemId !== null &&
    activeItemId !== undefined &&
    !service.items.some((i) => i.id === activeItemId);

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "premium-card glass overflow-hidden p-3 transition-all sm:p-6",
        isOver && isDraggingFromOtherService && "bg-accent/5 ring-2 ring-accent ring-offset-2"
      )}
    >
      <div className="mb-2 flex items-center justify-between sm:mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{service.title}</h3>
          {(service as any).peopleCount > 1 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400">
              {service.peopleCount} pers.
            </span>
          )}
          {!readOnly && (
            <button onClick={onEdit} className="text-gray-300 transition-colors hover:text-accent">
              <Pencil className="h-3.5 w-3.5" />
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
          allPeopleNames={people.map((p) => p.name)}
        />
      ))}
      {service.items.length === 0 && (
        <p
          className={clsx(
            "text-sm text-gray-500",
            isOver && isDraggingFromOtherService && "font-semibold text-accent"
          )}
        >
          {isOver && isDraggingFromOtherService
            ? "Déposez ici pour déplacer l'article"
            : "Aucun ingrédient pour l'instant."}
        </p>
      )}
    </section>
  );
}
