"use client";

import { useMemo } from "react";
import { Sparkles, Pencil, ShoppingCart, Scale, Euro, MessageSquare, ChefHat } from "lucide-react";
import { renderAvatar, getDisplayName } from "@/lib/utils";
import { motion } from "framer-motion";
import Image from "next/image";
import clsx from "clsx";
import { type PlanData, type Person, type Item, type Service, type Sheet } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useThemeMode } from "../theme-provider";

interface PeopleTabProps {
  plan: PlanData;
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
  selectedPerson,
  setSelectedPerson,
  setSheet,
  readOnly,
  currentUserId,
  onClaim,
  onUnclaim,
}: PeopleTabProps) {
  const { theme } = useThemeMode();
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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedPerson(null)}
          className={clsx(
            "rounded-full border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-95 sm:py-2",
            selectedPerson === null
              ? "border-accent/20 bg-accent text-white shadow-lg shadow-accent/20"
              : "border-gray-200 bg-white text-gray-700 hover:border-accent/20"
          )}
        >
          {t("all")}
        </button>
        {plan.people.map((person) => (
          <div
            key={person.id}
            className={clsx(
              "group flex items-center rounded-full border shadow-sm transition-all",
              selectedPerson === person.id
                ? "border-accent/20 bg-accent text-white shadow-lg shadow-accent/20"
                : "border-gray-200 bg-white text-gray-700 hover:border-accent/20"
            )}
          >
            <button
              type="button"
              onClick={() => setSelectedPerson(person.id)}
              className="flex items-center px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-95 sm:py-2"
            >
              <span className="mr-1.5 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full transition-all">
                {(() => {
                  const avatar = renderAvatar(
                    person,
                    plan.people.map((p) => p.name),
                    theme
                  );
                  if (avatar.type === "image") {
                    return (
                      <Image
                        src={avatar.src}
                        alt={getDisplayName(person)}
                        width={20}
                        height={20}
                        className="h-full w-full object-cover"
                      />
                    );
                  }
                  return avatar.value;
                })()}
              </span>
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
                  "mr-1 flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:h-7 sm:w-7",
                  selectedPerson === person.id
                    ? "text-white/80 hover:bg-white/20 hover:text-white"
                    : "text-gray-400 hover:bg-gray-100 hover:text-accent"
                )}
              >
                <Pencil
                  size={14}
                  className="opacity-0 transition-opacity group-hover:opacity-100 sm:h-3 sm:w-3"
                />
              </button>
            )}
            {person.userId === currentUserId && (
              <span className="mr-3 text-[10px] font-black uppercase tracking-widest text-accent/60">
                {t("me")}
              </span>
            )}
          </div>
        ))}
        {!readOnly && (
          <button
            type="button"
            onClick={() => setSheet({ type: "person" })}
            className="rounded-full border-2 border-dashed border-accent/20 bg-accent/5 px-4 py-2.5 text-sm font-semibold text-accent transition-all hover:border-accent/40 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-95 sm:py-2"
          >
            + {t("addMember")}
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
                <div className="sticky top-[72px] z-20 -mx-4 rounded-2xl border border-l-4 border-black/[0.05] border-l-accent bg-white/95 px-4 py-4 shadow-sm backdrop-blur-sm transition-all duration-300 sm:mx-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-accent/10 text-2xl shadow-sm">
                      {(() => {
                        const avatar = renderAvatar(
                          person,
                          plan.people.map((p) => p.name),
                          theme
                        );
                        if (avatar.type === "image") {
                          return (
                            <Image
                              src={avatar.src}
                              alt={getDisplayName(person)}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          );
                        }
                        return avatar.value;
                      })()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-gradient-header text-xl font-black tracking-tight">
                          {getDisplayName(person)}
                        </h3>
                        {person.userId === currentUserId ? (
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent ring-1 ring-accent/30">
                              {t("itsYou")}
                            </span>
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
                              className="relative flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg shadow-accent/20 transition-all hover:scale-105 hover:bg-accent/90 active:scale-95"
                            >
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                              </span>
                              {t("itsMe")}
                            </button>
                          )
                        )}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setSheet({ type: "person-edit", person })}
                            aria-label={t("edit")}
                            className="group rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:p-1"
                          >
                            <motion.div whileHover={{ rotate: 15 }}>
                              <Sparkles
                                size={18}
                                className="opacity-0 transition-opacity group-hover:opacity-100 sm:h-4 sm:w-4"
                              />
                            </motion.div>
                          </button>
                        )}
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                        {t("articlesCount", { count: personItems.length })}
                      </p>
                    </div>
                    {personItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSheet({ type: "shopping-list", person })}
                        aria-label={t("shoppingList")}
                        className="flex h-11 items-center gap-1.5 rounded-full bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-95 sm:h-auto sm:py-1.5"
                      >
                        <ShoppingCart size={16} className="sm:h-[14px] sm:w-[14px]" />
                        <span className="hidden sm:inline">{t("shoppingList")}</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {personItems.map(({ item, service, mealTitle }: PersonItem) => (
                    <motion.button
                      key={item.id}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSheet({ type: "item", serviceId: service.id, item })}
                      disabled={readOnly}
                      aria-label={t("editItem", { name: item.name })}
                      className="group relative w-full cursor-pointer overflow-hidden rounded-[24px] border border-gray-100 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:border-accent/20 hover:shadow-xl hover:shadow-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-[0.99] disabled:cursor-default sm:p-4"
                    >
                      {/* Decorative background gradient */}
                      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/5 blur-3xl transition-all group-hover:bg-accent/10" />
                      <div className="relative">
                        <p className="mb-1 text-xs font-black uppercase tracking-widest text-accent/60 sm:text-[10px]">
                          {mealTitle} • {service.title}
                        </p>
                        <p className="text-base font-bold text-text transition-colors group-hover:text-accent sm:text-base">
                          {item.name}
                        </p>
                        {(item.quantity ||
                          item.note ||
                          item.price ||
                          (item.ingredients && item.ingredients.length > 0)) && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {item.quantity?.trim() && (
                              <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-tight text-gray-600 sm:text-[11px]">
                                <Scale size={14} className="text-gray-500 sm:h-3 sm:w-3" />
                                {item.quantity}
                              </div>
                            )}
                            {item.price && (
                              <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-tight text-green-600 sm:text-[11px]">
                                <Euro size={14} className="text-green-500 sm:h-3 sm:w-3" />
                                {item.price.toFixed(2)} €
                              </div>
                            )}
                            {item.note && (
                              <div className="flex items-center gap-1 text-xs font-bold italic tracking-tight text-gray-600 sm:text-[11px]">
                                <MessageSquare size={14} className="text-gray-500 sm:h-3 sm:w-3" />
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
                            {item.ingredients && item.ingredients.length > 0 && (
                              <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-tight text-purple-500 sm:text-[11px]">
                                <ChefHat size={14} className="text-purple-400 sm:h-3 sm:w-3" />
                                {item.ingredients.filter((i) => i.checked).length}/
                                {item.ingredients.length}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                  {personItems.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50/50 py-8 text-center">
                      <p className="text-sm font-medium text-gray-400">{t("noItems")}</p>
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
