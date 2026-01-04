"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
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
        "relative rounded-3xl border border-white/20 bg-white/40 p-5 backdrop-blur-md transition-all sm:p-6",
        isOver && isDraggingFromOtherService
          ? "bg-accent/10 ring-2 ring-accent ring-offset-2"
          : "hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]"
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5 text-2xl">
            {service.title.toLowerCase().includes("apéritif") || service.title.toLowerCase().includes("aperitif")
              ? "🥂"
              : service.title.toLowerCase().includes("boisson") || service.title.toLowerCase().includes("drink")
                ? "🍷"
                : service.title.toLowerCase().includes("entrée") || service.title.toLowerCase().includes("starter")
                  ? "🥗"
                  : service.title.toLowerCase().includes("plat") || service.title.toLowerCase().includes("main")
                    ? "🍽️"
                    : service.title.toLowerCase().includes("dessert")
                      ? "🍰"
                      : "🍴"}
          </div>
          <div className="flex-1 min-w-0">
            {!readOnly ? (
              <button
                onClick={onEdit}
                className="group flex flex-col items-start text-left transition-colors"
                aria-label={t("editService", { name: service.title })}
              >
                <h3 className="text-xl font-black tracking-tight text-gray-800 transition-colors group-hover:text-accent">
                  {service.title}
                </h3>
                {(service.peopleCount || 0) > 1 && (
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {service.peopleCount} pers.
                  </span>
                )}
              </button>
            ) : (
              <div>
                <h3 className="text-xl font-black text-gray-800">{service.title}</h3>
                {(service.peopleCount || 0) > 1 && (
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {service.peopleCount} pers.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {service.items.length === 0 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-dashed border-gray-300/50 bg-gray-50/50 p-6 text-center">
            <p className="text-sm font-medium text-gray-500">
              {isOver && isDraggingFromOtherService ? t("dropHere") : t("noItems")}
            </p>
          </div>
          {!readOnly && filter.type === "all" && (
            <div className="flex items-center justify-between rounded-2xl bg-white/40 p-3 pr-2 backdrop-blur-sm">
              <p className="ml-2 text-sm font-medium text-gray-600">
                Ajouter quelque chose au menu ?
              </p>
              <Button
                variant="premium"
                size="premium"
                onClick={onCreate}
                icon={<Plus size={14} />}
                iconClassName="bg-accent text-white"
                className="shadow-sm"
              >
                <span className="text-xs font-black uppercase tracking-wider text-gray-700">{t("add")}</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {filteredItems.length > 0 && (
        <div className="space-y-2">
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
            <div className="mt-4 flex justify-center pt-2">
              <Button
                variant="premium"
                size="premium"
                onClick={onCreate}
                icon={<Plus size={16} />}
                iconClassName="bg-white text-accent group-hover:bg-accent group-hover:text-white transition-colors"
                className="w-full sm:w-auto bg-white/60 hover:bg-white border border-white/40 shadow-sm backdrop-blur-sm"
              >
                <span className="text-xs font-black uppercase tracking-wider text-accent">{t("add")}</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
