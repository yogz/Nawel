"use client";

import { Check } from "lucide-react";
import clsx from "clsx";
import { getPersonEmoji } from "@/lib/utils";
import { Person, PlanningFilter } from "@/lib/types";

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
        <div className="space-y-2 p-1 overflow-y-auto no-scrollbar">
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
                    <span className="text-xl">
                        {getPersonEmoji(person.name, people.map((p) => p.name), person.emoji)}
                    </span>
                    <span className="truncate">{person.name}</span>
                    {planningFilter.type === "person" && planningFilter.personId === person.id && (
                        <Check size={16} className="ml-auto" />
                    )}
                </button>
            ))}
        </div>
    );
}
