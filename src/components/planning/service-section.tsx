"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus, Pencil } from "lucide-react";
import { type Item, type Service, type Person, type PlanningFilter } from "@/lib/types";
import { ItemRow } from "./item-row";
import clsx from "clsx";
import { useTranslations } from "next-intl";

import { Button } from "../ui/button";

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

  const t = useTranslations("EventDashboard.Service");

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
        "overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 transition-all sm:p-6",
        isOver && isDraggingFromOtherService && "bg-accent/5 ring-2 ring-accent ring-offset-2"
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex flex-1 items-start gap-3">
          <div className="text-3xl">
            {service.title.toLowerCase().includes("apéritif") ||
            service.title.toLowerCase().includes("aperitif")
              ? "🥂"
              : service.title.toLowerCase().includes("boisson") ||
                  service.title.toLowerCase().includes("drink")
                ? "🍷"
                : service.title.toLowerCase().includes("entrée") ||
                    service.title.toLowerCase().includes("starter")
                  ? "🥗"
                  : service.title.toLowerCase().includes("plat") ||
                      service.title.toLowerCase().includes("main")
                    ? "🍽️"
                    : service.title.toLowerCase().includes("dessert")
                      ? "🍰"
                      : "🍴"}
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {!readOnly ? (
                <button
                  onClick={onEdit}
                  className="group flex w-full items-center gap-2 text-left transition-colors"
                  aria-label={t("editService", { name: service.title })}
                >
                  <h3 className="truncate text-xl font-bold tracking-tight text-text group-hover:text-accent">
                    {service.title}
                  </h3>
                </button>
              ) : (
                <h3 className="truncate text-xl font-bold text-text">{service.title}</h3>
              )}
            </div>
            {(service.peopleCount || 0) > 1 && (
              <span className="shrink-0 text-sm font-semibold text-gray-500">
                {service.peopleCount} pers.
              </span>
            )}
          </div>
        </div>
      </div>

      {service.items.length === 0 && !readOnly && filter.type === "all" && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-2">
          <p className="text-sm text-gray-500">Quelqu'un rapporte quelque chose ? 😋</p>
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-accent transition-colors active:bg-accent/10"
          >
            <Plus size={16} strokeWidth={2.5} />
            {t("add")}
          </button>
        </div>
      )}

      {filteredItems.length > 0 && (
        <>
          {filteredItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              person={people.find((p) => p.id === item.personId) || item.person}
              onAssign={() => onAssign(item)}
              onDelete={() => onDelete(item)}
              readOnly={readOnly}
              allPeopleNames={people.map((p) => p.name)}
              peopleCount={service.peopleCount}
            />
          ))}
          {!readOnly && filter.type === "all" && (
            <div className="mt-4 flex justify-center border-t border-dashed border-gray-200 pt-4">
              <button
                onClick={onCreate}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-accent transition-colors active:bg-accent/10"
              >
                <Plus size={16} strokeWidth={2.5} />
                {t("add")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
