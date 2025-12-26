"use client";

import { useMemo } from "react";
import { Sparkles, Pencil, ShoppingCart } from "lucide-react";
import { getPersonEmoji } from "@/lib/utils";
import { motion } from "framer-motion";
import clsx from "clsx";
import { type PlanData, type Person, type Item, type Service, type Sheet } from "@/lib/types";

interface PeopleTabProps {
  plan: PlanData;
  selectedPerson: number | null;
  setSelectedPerson: (id: number | null) => void;
  setSheet: (sheet: Sheet) => void;
  readOnly?: boolean;
  currentUserId?: string;
  onClaim?: (personId: number) => void;
  onUnclaim?: (personId: number) => void;
}

interface PersonItem {
  item: Item;
  service: Service;
  mealTitle: string;
}

export function PeopleTab({
  plan,
  selectedPerson,
  setSelectedPerson,
  setSheet,
  readOnly,
  currentUserId,
  onClaim,
  onUnclaim,
}: PeopleTabProps) {
  const itemsByPerson = useMemo(() => {
    const byPerson: Record<number, PersonItem[]> = {};
    plan.people.forEach((person: Person) => {
      byPerson[person.id] = [];
    });
    plan.meals.forEach((meal) => {
      meal.services.forEach((service) => {
        service.items.forEach((item) => {
          if (item.personId && byPerson[item.personId]) {
            byPerson[item.personId].push({ item, service, mealTitle: meal.title || meal.date });
          }
        });
      });
    });
    return byPerson;
  }, [plan.meals, plan.people]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedPerson(null)}
          className={clsx(
            "rounded-full px-4 py-2 text-sm font-semibold shadow-sm",
            selectedPerson === null
              ? "bg-accent text-white"
              : "bg-white text-gray-700 ring-1 ring-gray-200"
          )}
        >
          Tout le monde
        </button>
        {plan.people.map((person) => (
          <div
            key={person.id}
            className={clsx(
              "group flex items-center rounded-full shadow-sm transition-all",
              selectedPerson === person.id
                ? "bg-accent text-white ring-2 ring-accent/20"
                : "bg-white text-gray-700 ring-1 ring-gray-200"
            )}
          >
            <button
              onClick={() => setSelectedPerson(person.id)}
              className="flex items-center px-4 py-2 text-sm font-semibold"
            >
              <span className="mr-1.5">
                {getPersonEmoji(
                  person.name,
                  plan.people.map((p) => p.name),
                  person.emoji
                )}
              </span>
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
                  selectedPerson === person.id
                    ? "text-white/80 hover:bg-white/20 hover:text-white"
                    : "text-gray-400 hover:bg-gray-100 hover:text-accent"
                )}
              >
                <Pencil size={12} />
              </button>
            )}
            {person.userId === currentUserId && (
              <span className="mr-3 text-[10px] font-black uppercase tracking-widest text-accent/60">
                Moi
              </span>
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
        {plan.people
          .filter((p) => selectedPerson === null || selectedPerson === p.id)
          .map((person) => {
            const personItems = itemsByPerson[person.id] || [];
            // Show everyone even if they have no items, so they appear in "hero mode"

            return (
              <div key={person.id} className="space-y-3">
                <div className="sticky top-[72px] z-20 -mx-4 border-y border-accent/20 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-2xl shadow-sm ring-2 ring-accent/20">
                      {getPersonEmoji(
                        person.name,
                        plan.people.map((p) => p.name),
                        person.emoji
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black tracking-tight text-text">
                          {person.name}
                        </h3>
                        {person.userId === currentUserId ? (
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent ring-1 ring-accent/30">
                              C'est vous ! 👋
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Voulez-vous ne plus être associé à ce profil ?")) {
                                  onUnclaim?.(person.id);
                                }
                              }}
                              className="text-[10px] font-bold text-gray-400 underline underline-offset-2 hover:text-red-500"
                            >
                              Délier
                            </button>
                          </div>
                        ) : (
                          currentUserId &&
                          !plan.people.some((p) => p.userId === currentUserId) &&
                          !person.userId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClaim?.(person.id);
                              }}
                              className="rounded-full border border-accent/30 bg-accent/5 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent transition-all hover:bg-accent hover:text-white active:scale-95"
                            >
                              C'est moi !
                            </button>
                          )
                        )}
                        {!readOnly && (
                          <button
                            onClick={() => setSheet({ type: "person-edit", person })}
                            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-accent"
                          >
                            <motion.div whileHover={{ rotate: 15 }}>
                              <Sparkles size={16} />
                            </motion.div>
                          </button>
                        )}
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                        {personItems.length} article{personItems.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    {personItems.length > 0 && (
                      <button
                        onClick={() => setSheet({ type: "shopping-list", person })}
                        aria-label={`Afficher la liste de courses de ${person.name}`}
                        className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
                      >
                        <ShoppingCart size={14} />
                        <span className="hidden sm:inline">Liste de courses</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {personItems.map(({ item, service, mealTitle }: PersonItem) => (
                    <div
                      key={item.id}
                      className="premium-card group relative p-5 transition-all hover:border-accent/10"
                    >
                      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-accent/60">
                        {mealTitle} • {service.title}
                      </p>
                      <p className="text-base font-bold text-text">{item.name}</p>
                      {(item.quantity || item.note || item.price) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.quantity && (
                            <span className="rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-bold uppercase text-gray-500">
                              📦 {item.quantity}
                            </span>
                          )}
                          {item.price && (
                            <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase text-zinc-900">
                              💶 {item.price}€
                            </span>
                          )}
                          {item.note && (
                            <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase text-zinc-900">
                              📝 {item.note}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {personItems.length === 0 && (
                    <div className="rounded-3xl border-2 border-dashed border-gray-100 bg-gray-50/50 py-8 text-center">
                      <p className="text-sm font-medium text-gray-400">Aucun article assigné</p>
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
