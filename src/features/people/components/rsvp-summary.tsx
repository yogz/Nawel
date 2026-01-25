"use client";

import React, { useMemo } from "react";
import { Check, X, HelpCircle, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { type PlanData, type Sheet } from "@/lib/types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PersonAvatar } from "@/components/common/person-avatar";
import { getDisplayName } from "@/lib/utils";

interface RSVPSummaryProps {
  plan: PlanData;
  onSelectPerson: (id: number | null) => void;
  selectedPersonId: number | null;
  onAddPerson?: () => void;
  readOnly?: boolean;
}

export function RSVPSummary({
  plan,
  onSelectPerson,
  selectedPersonId,
  onAddPerson,
  readOnly,
}: RSVPSummaryProps) {
  const t = useTranslations("EventDashboard.People");

  // Memoize stats calculation to prevent re-computation on every render
  const stats = useMemo(
    () =>
      plan.people.reduce(
        (acc, person) => {
          const status = person.status;
          const adults = person.guest_adults || 0;
          const children = person.guest_children || 0;

          if (status === "confirmed") {
            acc.confirmed += 1 + adults + children;
          } else if (status === "declined") {
            acc.declined++;
          } else if (status === "maybe") {
            acc.maybe++;
          } else {
            acc.pending++;
          }
          return acc;
        },
        { confirmed: 0, declined: 0, maybe: 0, pending: 0 }
      ),
    [plan.people]
  );

  // Memoize all names array to prevent new array creation on every render
  const allNames = useMemo(() => plan.people.map((p) => p.name), [plan.people]);

  return (
    <div className="space-y-4">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max space-x-3 p-1">
          {/* All Filter Card */}
          <button
            onClick={() => onSelectPerson(null)}
            className={clsx(
              "group relative flex h-14 min-w-[100px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-4 transition-all outline-none",
              selectedPersonId === null
                ? "border-accent bg-accent text-white shadow-md shadow-accent/20"
                : "border-gray-200 bg-white hover:border-accent/30 hover:bg-gray-50"
            )}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={clsx(
                  "text-[10px] font-black uppercase tracking-widest",
                  selectedPersonId === null ? "text-white" : "text-gray-900"
                )}
              >
                {t("all")}
              </span>
              <span
                className={clsx(
                  "text-[10px] font-bold",
                  selectedPersonId === null ? "text-white/80" : "text-gray-400"
                )}
              >
                ({plan.people.length})
              </span>
            </div>

            <div className="flex gap-2">
              <div className="flex items-center gap-0.5">
                <Check
                  size={8}
                  strokeWidth={4}
                  className={selectedPersonId === null ? "text-white" : "text-green-600"}
                />
                <span className="text-[9px] font-bold">{stats.confirmed}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <HelpCircle
                  size={8}
                  strokeWidth={4}
                  className={selectedPersonId === null ? "text-white" : "text-orange-500"}
                />
                <span className="text-[9px] font-bold">{stats.maybe}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <X
                  size={8}
                  strokeWidth={4}
                  className={selectedPersonId === null ? "text-white" : "text-red-500"}
                />
                <span className="text-[9px] font-bold">{stats.declined}</span>
              </div>
            </div>
          </button>

          {/* Individual Avatars */}
          {plan.people.map((person) => {
            const status = person.status;
            return (
              <button
                key={person.id}
                onClick={() => onSelectPerson(person.id)}
                className={clsx(
                  "flex flex-col items-center gap-1.5 transition-all outline-none",
                  selectedPersonId === person.id ? "opacity-100 scale-105" : "opacity-60"
                )}
              >
                <div
                  className={clsx(
                    "relative p-0.5 rounded-full border-2 transition-all",
                    selectedPersonId === person.id ? "border-accent" : "border-transparent"
                  )}
                >
                  <PersonAvatar
                    person={person}
                    allNames={allNames}
                    size="md"
                    className="h-11 w-11 shadow-sm ring-2 ring-white"
                  />
                  {status && (
                    <div
                      className={clsx(
                        "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white",
                        status === "confirmed"
                          ? "bg-green-500"
                          : status === "declined"
                            ? "bg-red-500"
                            : "bg-gray-200"
                      )}
                    >
                      {status === "confirmed" && <Check size={8} strokeWidth={4} />}
                      {status === "declined" && <X size={8} strokeWidth={4} />}
                    </div>
                  )}
                </div>
                <span
                  className={clsx(
                    "text-[8px] font-bold uppercase tracking-wider truncate max-w-[50px]",
                    selectedPersonId === person.id ? "text-accent" : "text-gray-500"
                  )}
                >
                  {getDisplayName(person)}
                </span>
              </button>
            );
          })}

          {!readOnly && onAddPerson && (
            <button
              onClick={onAddPerson}
              className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-all outline-none"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:border-accent hover:text-accent hover:bg-accent/5">
                <Plus size={20} />
              </div>
              <span className="text-[10px] font-medium text-gray-500">{t("add")}</span>
            </button>
          )}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>
    </div>
  );
}
