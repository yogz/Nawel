"use client";

import Link from "next/link";
import { Check, ShieldAlert, Share, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { getPersonEmoji } from "@/lib/utils";
import { PlanData, PlanningFilter } from "@/lib/types";
import { SheetState } from "@/hooks/use-event-state";

interface OrganizerHeaderProps {
    christmas: boolean;
    readOnly: boolean;
    tab: string;
    plan: PlanData;
    planningFilter: PlanningFilter;
    setPlanningFilter: (filter: PlanningFilter) => void;
    setSheet: (sheet: SheetState) => void;
    sheet: SheetState | null;
    unassignedItemsCount: number;
}

export function OrganizerHeader({
    christmas,
    readOnly,
    tab,
    plan,
    planningFilter,
    setPlanningFilter,
    setSheet,
    sheet,
    unassignedItemsCount,
}: OrganizerHeaderProps) {
    return (
        <>
            {christmas && (
                <div className="christmas-garland">
                    {Array.from({ length: 14 }).map((_, i) => (
                        <div key={i} className="christmas-light" />
                    ))}
                </div>
            )}

            {readOnly && (
                <div className="flex items-center gap-2 bg-amber-100 px-4 py-3 text-sm text-amber-800">
                    <ShieldAlert size={16} />
                    Mode lecture (ajoute ?key=... pour éditer) 🔒
                </div>
            )}

            <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md px-4 py-4 border-b border-black/[0.03]">
                <div className="flex items-center justify-between">
                    <Link href="/" className="text-2xl font-black italic tracking-tight text-accent hover:opacity-80 transition-opacity">
                        NAWEL ✨
                    </Link>
                    <div className="flex items-center gap-2">
                        {!readOnly ? (
                            <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-green-700">
                                <Check size={12} />Live
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                                <ShieldAlert size={12} />Miroir
                            </span>
                        )}
                        {!readOnly && (
                            <button
                                onClick={() => setSheet({ type: "share" })}
                                className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent hover:bg-accent/20 transition-colors"
                                title="Partager l'accès"
                            >
                                <Share size={12} />Partager
                            </button>
                        )}
                    </div>
                </div>

                {tab === "planning" && (
                    <PlanningFilters
                        plan={plan}
                        planningFilter={planningFilter}
                        setPlanningFilter={setPlanningFilter}
                        setSheet={setSheet}
                        sheet={sheet}
                        unassignedItemsCount={unassignedItemsCount}
                    />
                )}
            </header>
        </>
    );
}

interface PlanningFiltersProps {
    plan: PlanData;
    planningFilter: PlanningFilter;
    setPlanningFilter: (filter: PlanningFilter) => void;
    setSheet: (sheet: SheetState) => void;
    sheet: SheetState | null;
    unassignedItemsCount: number;
}

function PlanningFilters({
    plan,
    planningFilter,
    setPlanningFilter,
    setSheet,
    sheet,
    unassignedItemsCount,
}: PlanningFiltersProps) {
    return (
        <div className="mt-4 flex flex-col gap-3">
            <div className="flex gap-2">
                <button
                    onClick={() => setPlanningFilter({ type: "all" })}
                    className={clsx(
                        "rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all",
                        planningFilter.type === "all"
                            ? "bg-accent text-white shadow-md ring-2 ring-accent/20"
                            : "bg-white text-gray-400 hover:text-gray-600"
                    )}
                >
                    Tout le monde
                </button>
                <button
                    onClick={() => setPlanningFilter({ type: "unassigned" })}
                    className={clsx(
                        "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all",
                        planningFilter.type === "unassigned"
                            ? "bg-amber-400 text-amber-950 shadow-md ring-2 ring-amber-400/20"
                            : "bg-white text-gray-400 hover:text-amber-600"
                    )}
                >
                    À prévoir ({unassignedItemsCount}) 🥘
                </button>

                {plan.people.length > 0 && (
                    <div className="relative">
                        <button
                            onClick={() => setSheet({ type: "person-select" })}
                            className={clsx(
                                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all",
                                planningFilter.type === "person"
                                    ? "bg-accent text-white shadow-md ring-2 ring-accent/20"
                                    : "bg-white text-gray-400 hover:text-gray-600"
                            )}
                        >
                            {planningFilter.type === "person" ? (
                                <>
                                    {getPersonEmoji(
                                        plan.people.find((p) => p.id === planningFilter.personId)?.name || "",
                                        plan.people.map((p) => p.name),
                                        plan.people.find((p) => p.id === planningFilter.personId)?.emoji
                                    )}{" "}
                                    {plan.people.find((p) => p.id === planningFilter.personId)?.name}
                                </>
                            ) : (
                                "Par personne"
                            )}
                            <ChevronDown
                                size={14}
                                className={clsx("transition-transform", sheet?.type === "person-select" && "rotate-180")}
                            />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
