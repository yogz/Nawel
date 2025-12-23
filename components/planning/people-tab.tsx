"use client";

import { useMemo } from "react";
import { Sparkles, Pencil } from "lucide-react";
import { getPersonEmoji } from "@/lib/utils";
import { motion } from "framer-motion";
import clsx from "clsx";
import { PlanData, Person, Item, Meal } from "@/lib/types";
import { SheetState } from "@/hooks/use-event-state";

interface PeopleTabProps {
    plan: PlanData;
    selectedPerson: number | null;
    setSelectedPerson: (id: number | null) => void;
    setSheet: (sheet: SheetState) => void;
    readOnly?: boolean;
}

interface PersonItem {
    item: Item;
    meal: Meal;
    dayTitle: string;
}

export function PeopleTab({
    plan,
    selectedPerson,
    setSelectedPerson,
    setSheet,
    readOnly
}: PeopleTabProps) {
    const itemsByPerson = useMemo(() => {
        const byPerson: Record<number, PersonItem[]> = {};
        plan.people.forEach((person: Person) => { byPerson[person.id] = []; });
        plan.days.forEach((day) => {
            day.meals.forEach((meal) => {
                meal.items.forEach((item) => {
                    if (item.personId && byPerson[item.personId]) {
                        byPerson[item.personId].push({ item, meal, dayTitle: day.title || day.date });
                    }
                });
            });
        });
        return byPerson;
    }, [plan.days, plan.people]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedPerson(null)}
                    className={clsx(
                        "rounded-full px-4 py-2 text-sm font-semibold shadow-sm",
                        selectedPerson === null ? "bg-accent text-white" : "bg-white text-gray-700 ring-1 ring-gray-200"
                    )}
                >
                    Tout le monde
                </button>
                {plan.people.map((person) => (
                    <div
                        key={person.id}
                        className={clsx(
                            "group flex items-center rounded-full shadow-sm transition-all",
                            selectedPerson === person.id ? "bg-accent text-white ring-2 ring-accent/20" : "bg-white text-gray-700 ring-1 ring-gray-200"
                        )}
                    >
                        <button
                            onClick={() => setSelectedPerson(person.id)}
                            className="flex items-center px-4 py-2 text-sm font-semibold"
                        >
                            <span className="mr-1.5">{getPersonEmoji(person.name, plan.people.map((p) => p.name), person.emoji)}</span>
                            {person.name}
                        </button>
                        {!readOnly && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSheet({ type: "person-edit", person });
                                }}
                                className={clsx(
                                    "mr-1 flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                                    selectedPerson === person.id ? "hover:bg-white/20 text-white/80 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-accent"
                                )}
                            >
                                <Pencil size={12} />
                            </button>
                        )}
                    </div>
                ))}
                {!readOnly && (
                    <button
                        onClick={() => setSheet({ type: "person" })}
                        className="rounded-full border-2 border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
                    >
                        + Ajouter un membre
                    </button>
                )}
            </div>

            <div className="space-y-8">
                {plan.people.filter((p) => selectedPerson === null || selectedPerson === p.id).map((person) => {
                    const personItems = itemsByPerson[person.id] || [];
                    if (personItems.length === 0 && selectedPerson === null) return null;

                    return (
                        <div key={person.id} className="space-y-3">
                            <div className="sticky top-[72px] z-20 -mx-4 px-4 py-3 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 backdrop-blur-sm border-y border-accent/20">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-2xl shadow-sm ring-2 ring-accent/20">
                                        {getPersonEmoji(person.name, plan.people.map((p) => p.name), person.emoji)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-black tracking-tight text-text">{person.name}</h3>
                                            {!readOnly && (
                                                <button onClick={() => setSheet({ type: "person-edit", person })} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-accent transition-colors">
                                                    <motion.div whileHover={{ rotate: 15 }}><Sparkles size={16} /></motion.div>
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                                            {personItems.length} article{personItems.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {personItems.map(({ item, meal, dayTitle }: PersonItem) => (
                                    <div key={item.id} className="premium-card p-5 relative group hover:border-accent/10 transition-all">
                                        <p className="text-[10px] uppercase font-black tracking-widest text-accent/60 mb-1">{dayTitle} • {meal.title}</p>
                                        <p className="text-base font-bold text-text">{item.name}</p>
                                        {(item.quantity || item.note || item.price) && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {item.quantity && <span className="rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-500 uppercase">📦 {item.quantity}</span>}
                                                {item.price && <span className="rounded-lg bg-green-50 px-2 py-1 text-[10px] font-bold text-green-600 uppercase">💶 {item.price}€</span>}
                                                {item.note && <span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-500 uppercase">📝 {item.note}</span>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {personItems.length === 0 && (
                                    <div className="py-8 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                                        <p className="text-sm text-gray-400 font-medium">Aucun article assigné</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
