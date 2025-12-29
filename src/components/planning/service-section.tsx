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
        "premium-card glass overflow-hidden p-3 transition-all sm:p-6",
        isOver && isDraggingFromOtherService && "bg-accent/5 ring-2 ring-accent ring-offset-2"
      )}
    >
      <div className="mb-2 flex items-center justify-between sm:mb-3">
        <div className="flex items-center gap-2">
          {!readOnly ? (
            <button
              onClick={onEdit}
              className="group flex items-center gap-2 text-left transition-colors hover:text-accent"
              aria-label={t("editService", { name: service.title })}
            >
              <h3 className="text-lg font-semibold tracking-tight text-text group-hover:text-accent">
                {service.title}
              </h3>
            </button>
          ) : (
            <h3 className="text-lg font-semibold text-text">{service.title}</h3>
          )}
          {(service.peopleCount || 0) > 1 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400">
              {service.peopleCount} pers.
            </span>
          )}
        </div>
        {!readOnly && filter.type === "all" && (
          <Button
            variant="premium"
            size="premium"
            onClick={onCreate}
            icon={<Plus size={16} />}
            className="btn-prominent"
            iconClassName="bg-white/20 text-white group-hover:bg-white/40"
          >
            <span className="text-xs font-bold">{t("add")}</span>
          </Button>
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
          peopleCount={service.peopleCount}
        />
      ))}
      {!readOnly && filter.type === "all" && filteredItems.length > 3 && (
        <div className="mt-4 flex justify-center border-t border-dashed border-gray-200 pt-4">
          <Button
            variant="premium"
            size="premium"
            onClick={onCreate}
            icon={<Plus size={16} />}
            className="btn-prominent w-full sm:w-auto"
            iconClassName="bg-white/20 text-white group-hover:bg-white/40"
          >
            <span className="text-xs font-bold">{t("add")}</span>
          </Button>
        </div>
      )}
      {service.items.length === 0 && (
        <p
          className={clsx(
            "text-sm text-gray-500",
            isOver && isDraggingFromOtherService && "font-semibold text-accent"
          )}
        >
          {isOver && isDraggingFromOtherService ? t("dropHere") : t("noItems")}
        </p>
      )}
    </section>
  );
}
