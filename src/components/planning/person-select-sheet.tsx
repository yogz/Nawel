"use client";

import { Check } from "lucide-react";
import clsx from "clsx";
import { getPersonEmoji, renderAvatar } from "@/lib/utils";
import { type Person, type PlanningFilter } from "@/lib/types";

interface PersonSelectSheetProps {
  people: Person[];
  planningFilter: PlanningFilter;
  setPlanningFilter: (filter: PlanningFilter) => void;
  onClose: () => void;
}

export function PersonSelectSheet({
  people,
  planningFilter,
  setPlanningFilter,
  onClose,
}: PersonSelectSheetProps) {
  return (
    <div className="no-scrollbar space-y-2 overflow-y-auto p-1">
      <button
        onClick={() => {
          setPlanningFilter({ type: "all" });
          onClose();
        }}
        className={clsx(
          "flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-sm font-bold transition-all",
          planningFilter.type === "all"
            ? "bg-accent/10 text-accent ring-1 ring-accent/20"
            : "text-gray-600 hover:bg-gray-50"
        )}
      >
        <span>Tout le monde</span>
        {planningFilter.type === "all" && <Check size={16} className="ml-auto" />}
      </button>
      {people.map((person) => (
        <button
          key={person.id}
          onClick={() => {
            setPlanningFilter({ type: "person", personId: person.id });
            onClose();
          }}
          className={clsx(
            "flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-sm font-bold transition-all",
            planningFilter.type === "person" && planningFilter.personId === person.id
              ? "bg-accent/10 text-accent ring-1 ring-accent/20"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {(() => {
              const avatar = renderAvatar(
                person,
                people.map((p) => p.name)
              );
              if (avatar.type === "image") {
                return (
                  <img src={avatar.src} alt={person.name} className="h-full w-full object-cover" />
                );
              }
              return <span>{avatar.value}</span>;
            })()}
          </div>
          <span className="truncate">{person.name}</span>
          {planningFilter.type === "person" && planningFilter.personId === person.id && (
            <Check size={16} className="ml-auto" />
          )}
        </button>
      ))}
    </div>
  );
}
