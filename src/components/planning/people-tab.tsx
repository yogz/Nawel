"use client";

import { useMemo } from "react";
import {
  Sparkles,
  Pencil,
  ShoppingCart,
  Scale,
  Euro,
  MessageSquare,
  ChefHat,
  Plus,
  ChevronRight,
} from "lucide-react";
import { getDisplayName } from "@/lib/utils";
import { motion } from "framer-motion";
import clsx from "clsx";
import { type PlanData, type Person, type Item, type Service, type Sheet } from "@/lib/types";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PersonAvatar } from "../common/person-avatar";

interface PeopleTabProps {
  plan: PlanData;
  slug: string;
  writeKey?: string;
  selectedPerson: number | null;
  setSelectedPerson: (id: number | null) => void;
  setSheet: (sheet: Sheet) => void;
  onClaim?: (personId: number) => void;
  onUnclaim?: (personId: number) => void; // Keeping prop for now to avoid breaking too many things, but will remove usage
  readOnly?: boolean;
  currentUserId?: string;
}

interface PersonItem {
  item: Item;
  service: Service;
  mealTitle: string;
}

export function PeopleTab({
  plan,
  slug,
  writeKey,
  selectedPerson,
  setSelectedPerson,
  setSheet,
  readOnly,
  currentUserId,
  onClaim,
  onUnclaim: _onUnclaim,
}: PeopleTabProps) {
  const t = useTranslations("EventDashboard.People");
  const tForm = useTranslations("EventDashboard.ItemForm");
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
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setSelectedPerson(null)}
          className={clsx(
            "rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-95",
            selectedPerson === null
              ? "bg-accent text-white shadow-xl shadow-accent/20"
              : "bg-white/50 text-gray-500 hover:bg-white hover:text-accent"
          )}
        >
          {t("all")}
        </button>
        {plan.people.map((person) => (
          <div
            key={person.id}
            className={clsx(
              "group flex items-center rounded-2xl transition-all",
              selectedPerson === person.id
                ? "bg-accent text-white shadow-xl shadow-accent/20"
                : "bg-white/50 text-gray-500 hover:bg-white hover:text-accent"
            )}
          >
            <button
              type="button"
              onClick={() => setSelectedPerson(person.id)}
              className="flex items-center px-4 py-3 text-sm font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-95"
            >
              <PersonAvatar
                person={person}
                allNames={plan.people.map((p) => p.name)}
                size="xs"
                className="mr-2.5 shadow-sm ring-2 ring-white/20"
              />
              {getDisplayName(person)}
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSheet({ type: "person-edit", person });
                }}
                aria-label={t("edit")}
                className={clsx(
                  "mr-1 flex h-10 w-10 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                  selectedPerson === person.id
                    ? "text-white/80 hover:bg-white/20 hover:text-white"
                    : "text-gray-400 hover:bg-white hover:text-accent"
                )}
              >
                <Pencil
                  size={14}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                />
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button
            type="button"
            onClick={() => setSheet({ type: "person" })}
            className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-accent/20 bg-accent/5 px-5 py-3 text-sm font-black uppercase tracking-widest text-accent transition-all hover:border-accent/40 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            {t("addMember")}
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
              <div key={person.id} className="space-y-6">
                <div className="group/hero relative overflow-hidden rounded-[32px] border border-white/40 bg-white/90 p-6 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:shadow-accent/5 sm:p-8">
                  {/* Vibrant background aesthetic */}
                  <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-[80px] transition-all group-hover/hero:bg-accent/20" />
                  <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary/5 blur-[80px] transition-all group-hover/hero:bg-primary/10" />

                  <div className="relative flex items-center gap-6">
                    <div className="relative">
                      <PersonAvatar
                        person={person}
                        allNames={plan.people.map((p) => p.name)}
                        size="xl"
                        rounded="2xl"
                        className="shadow-2xl ring-4 ring-white/50"
                      />
                      {person.userId === currentUserId && (
                        <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-accent shadow-lg shadow-accent/40 ring-2 ring-white">
                          <Sparkles size={16} className="text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-gradient-header text-3xl font-black tracking-tight sm:text-4xl">
                          {getDisplayName(person)}
                        </h3>
                        {person.userId === currentUserId ? (
                          <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-accent ring-1 ring-accent/20">
                            {t("itsYou")}
                          </span>
                        ) : (
                          currentUserId &&
                          !plan.people.some((p) => p.userId === currentUserId) &&
                          !person.userId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClaim?.(person.id);
                              }}
                              className="relative flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-accent/30 transition-all hover:scale-105 hover:bg-accent/90 active:scale-95"
                            >
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                              </span>
                              {t("itsMe")}
                            </button>
                          )
                        )}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setSheet({ type: "person-edit", person })}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-accent/60">
                          {t("articlesCount", { count: personItems.length })}
                        </p>
                        {personItems.length > 0 && (
                          <div className="h-1 w-1 rounded-full bg-gray-200" />
                        )}
                        {personItems.length > 0 && (
                          <p className="text-xs font-medium text-gray-400">
                            Dernière mise à jour : {new Date().toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {personItems.length > 0 && (
                      <Link
                        href={
                          writeKey
                            ? `/event/${slug}/shopping/${person.id}?key=${writeKey}`
                            : `/event/${slug}/shopping/${person.id}`
                        }
                        className="group/btn flex h-14 items-center gap-3 rounded-2xl bg-accent px-6 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-accent/20 transition-all hover:scale-[1.02] hover:bg-accent/90 active:scale-95 sm:h-auto sm:py-4"
                      >
                        <ShoppingCart
                          size={20}
                          className="transition-transform group-hover/btn:-rotate-12"
                        />
                        <span className="hidden sm:inline">{t("shoppingList")}</span>
                      </Link>
                    )}
                  </div>
                </div>
                <div className="overflow-hidden rounded-[32px] border border-white/40 bg-white/90 shadow-2xl backdrop-blur-xl">
                  <div className="flex flex-col">
                    {personItems.map(({ item, service, mealTitle }: PersonItem) => (
                      <motion.button
                        key={item.id}
                        type="button"
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSheet({ type: "item", serviceId: service.id, item })}
                        disabled={readOnly}
                        aria-label={t("editItem", { name: item.name })}
                        className="group relative w-full cursor-pointer px-6 py-5 text-left transition-all duration-300 hover:bg-accent/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-default sm:px-8 sm:py-6"
                      >
                        {/* Interactive background reveal */}
                        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/0 blur-3xl transition-all duration-500 group-hover:bg-accent/5" />

                        <div className="relative">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/50">
                              {plan.meals.length > 1 ? `${mealTitle} • ` : ""}
                              {service.title}
                            </p>
                            <ChevronRight
                              size={16}
                              className="text-accent/20 transition-all group-hover:translate-x-1 group-hover:text-accent"
                            />
                          </div>
                          <p className="text-base font-bold tracking-tight text-gray-900 transition-colors group-hover:text-accent">
                            {item.name}
                          </p>
                          {(item.quantity ||
                            item.note ||
                            item.price ||
                            (item.ingredients && item.ingredients.length > 0)) && (
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              {item.quantity?.trim() && (
                                <div className="flex items-center gap-1.5 rounded-lg bg-gray-50/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-600 ring-1 ring-gray-100">
                                  <Scale size={11} className="text-gray-400" />
                                  {item.quantity}
                                </div>
                              )}
                              {item.price && (
                                <div className="flex items-center gap-1.5 rounded-lg bg-green-50/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.05em] text-green-700 ring-1 ring-green-500/10">
                                  <Euro size={11} className="text-green-600" />
                                  {item.price.toFixed(2)}
                                </div>
                              )}
                              {item.ingredients && item.ingredients.length > 0 && (
                                <div className="flex items-center gap-1.5 rounded-lg bg-accent/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.05em] text-accent ring-1 ring-accent/10">
                                  <ChefHat size={11} className="text-accent" />
                                  {item.ingredients.filter((i) => i.checked).length}/
                                  {item.ingredients.length}
                                </div>
                              )}
                              {item.note && (
                                <div className="flex items-center gap-1.5 rounded-lg bg-blue-50/30 px-2.5 py-1 text-[10px] font-medium italic tracking-wider text-blue-700 ring-1 ring-blue-100/30">
                                  <MessageSquare size={11} className="text-blue-400" />
                                  <span className="max-w-[150px] truncate">
                                    {item.note.startsWith("EventDashboard.")
                                      ? tForm("defaultNote", {
                                          count:
                                            service.peopleCount ||
                                            service.adults + service.children ||
                                            0,
                                        })
                                      : item.note}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="absolute bottom-0 left-6 right-6 h-px bg-gray-100 group-last:hidden" />
                        </div>
                      </motion.button>
                    ))}
                    {personItems.length === 0 && (
                      <div className="p-8 text-center bg-gray-50/30">
                        <p className="text-sm font-medium text-gray-400">{t("noItems")}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
