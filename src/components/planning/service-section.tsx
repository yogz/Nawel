"use client";

import { useDroppable } from "@dnd-kit/core";
import { PlusIcon, Users, Edit3 } from "lucide-react";
import { type PlanningFilter, type Service, type Person, type Item } from "@/lib/types";
import { ItemRow } from "./item-row";
import { Button } from "../ui/button";
import { memo } from "react";
import { useTranslations } from "next-intl";

interface ServiceSectionProps {
  service: Service;
  people: Person[];
  readOnly?: boolean;
  onAssign: (item: Item) => void;
  onDelete: (item: Item) => void;
  onCreate: () => void;
  onEdit: () => void;
  filter: PlanningFilter;
  activeItemId: number | null;
}

export const ServiceSection = memo(function ServiceSection({
  service,
  people,
  readOnly,
  onAssign,
  onDelete,
  onCreate,
  onEdit,
  filter,
  activeItemId,
}: ServiceSectionProps) {
  const t = useTranslations("EventDashboard.Planning");
  const { setNodeRef, isOver } = useDroppable({
    id: `service-${service.id}`,
  });

  const filteredItems = service.items.filter((i) => {
    if (filter.type === "all") return true;
    if (filter.type === "unassigned") return !i.personId;
    if (filter.type === "person") return i.personId === filter.personId;
    return true;
  });

  if (filter.type !== "all" && filteredItems.length === 0) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-2xl border border-white/40 bg-white/40 p-4 backdrop-blur-md transition-all duration-300 ${
        isOver ? "scale-[1.01] ring-2 ring-accent ring-offset-2" : ""
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-xl shadow-sm ring-1 ring-black/5">
            {service.icon || "🛒"}
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-gray-800">
              {service.title}
            </h3>
            <p className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
              <Users size={10} />
              {service.peopleCount || 0} PERS.
            </p>
          </div>
        </div>
        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 w-8 rounded-full p-0 text-gray-400 hover:bg-accent/10 hover:text-accent"
          >
            <Edit3 size={14} />
          </Button>
        )}
      </div>

      <div className="space-y-1">
        {filteredItems.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            people={people}
            readOnly={readOnly}
            onAssign={() => onAssign(item)}
            onDelete={() => onDelete(item)}
            isDragging={activeItemId === item.id}
          />
        ))}

        {!readOnly && (
          <Button
            variant="premium"
            className="mt-3 h-10 w-full rounded-xl border border-dashed border-accent/20 bg-accent/5 transition-all hover:bg-accent/10"
            icon={<PlusIcon size={16} className="text-accent" />}
            onClick={onCreate}
          >
            <span className="text-[11px] font-black uppercase tracking-wider text-accent">
              {t("addItem")}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
});
