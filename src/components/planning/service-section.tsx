"use client";

import { useDroppable } from "@dnd-kit/core";
import { PlusIcon, Users, Edit3 } from "lucide-react";
import { type PlanningFilter, type Service, type Person, type Item } from "@/lib/types";
import { ItemRow } from "./item-row";
import { Button } from "../ui/button";
import { memo } from "react";
import { useTranslations } from "next-intl";
import { cn, getServiceIcon } from "@/lib/utils";

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

  const allPeopleNames = people.map((p) => p.name);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative rounded-2xl border border-white/40 bg-white/90 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-sm transition-all duration-300",
        isOver && "scale-[1.01] ring-2 ring-accent ring-offset-2"
      )}
    >
      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-accent/10 bg-accent/5 text-base shadow-sm">
            {service.icon || getServiceIcon(service.title)}
          </div>
          <h3 className="text-sm font-black uppercase tracking-[0.15em] text-black">
            {service.title}
          </h3>
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

      <div className="flex flex-col">
        {filteredItems.map((item, index) => (
          <div
            key={item.id}
            className={index !== filteredItems.length - 1 ? "border-b border-gray-100" : ""}
          >
            <ItemRow
              item={item}
              person={people.find((p) => p.id === item.personId)}
              readOnly={readOnly}
              onAssign={() => onAssign(item)}
              onDelete={() => onDelete(item)}
              allPeopleNames={allPeopleNames}
              peopleCount={service.peopleCount || 0}
            />
          </div>
        ))}

        {!readOnly && (
          <Button
            variant="ghost"
            className="group mt-2 h-10 w-full rounded-xl border border-dashed border-gray-200 bg-gray-50/30 transition-all hover:border-accent/30 hover:bg-white"
            onClick={onCreate}
          >
            <div className="flex items-center gap-2">
              <PlusIcon size={14} className="text-gray-400 group-hover:text-accent" />
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 group-hover:text-accent">
                {t("addItem")}
              </span>
            </div>
          </Button>
        )}
      </div>
    </div>
  );
});
