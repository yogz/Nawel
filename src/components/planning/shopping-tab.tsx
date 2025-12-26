"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart, ExternalLink, Check } from "lucide-react";
import { getPersonEmoji } from "@/lib/utils";
import { type PlanData, type Person } from "@/lib/types";

interface ShoppingTabProps {
  plan: PlanData;
  slug: string;
  writeKey?: string;
}

interface PersonSummary {
  person: Person;
  totalItems: number;
  checkedItems: number;
}

export function ShoppingTab({ plan, slug, writeKey }: ShoppingTabProps) {
  const summaries = useMemo(() => {
    const result: PersonSummary[] = [];

    plan.people.forEach((person) => {
      let totalItems = 0;
      let checkedItems = 0;

      plan.meals.forEach((meal) => {
        meal.services.forEach((service) => {
          service.items.forEach((item) => {
            if (item.personId !== person.id) return;

            if (item.ingredients && item.ingredients.length > 0) {
              totalItems += item.ingredients.length;
              checkedItems += item.ingredients.filter((i) => i.checked).length;
            } else {
              totalItems += 1;
              if (item.checked) checkedItems += 1;
            }
          });
        });
      });

      if (totalItems > 0) {
        result.push({ person, totalItems, checkedItems });
      }
    });

    return result;
  }, [plan.meals, plan.people]);

  const totalAll = summaries.reduce((acc, s) => acc + s.totalItems, 0);
  const checkedAll = summaries.reduce((acc, s) => acc + s.checkedItems, 0);
  const progressAll = totalAll > 0 ? Math.round((checkedAll / totalAll) * 100) : 0;

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShoppingCart className="mb-4 h-16 w-16 text-gray-200" />
        <h3 className="mb-2 text-lg font-bold text-text">Aucune course</h3>
        <p className="text-sm text-muted-foreground">
          Assignez des articles aux convives pour voir leurs listes de courses ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global progress */}
      <div className="premium-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Progression totale</p>
            <p className="text-2xl font-bold text-text">
              {checkedAll}/{totalAll}
              <span className="ml-2 text-sm font-normal text-muted-foreground">articles</span>
            </p>
          </div>
          <div className="text-3xl font-black text-accent">{progressAll}%</div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progressAll}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Per-person lists */}
      <div className="space-y-3">
        {summaries.map(({ person, totalItems, checkedItems }) => {
          const progress = Math.round((checkedItems / totalItems) * 100);
          const isComplete = checkedItems === totalItems;
          const url = writeKey
            ? `/event/${slug}/shopping/${person.id}?key=${writeKey}`
            : `/event/${slug}/shopping/${person.id}`;

          return (
            <Link
              key={person.id}
              href={url}
              className="group block rounded-2xl border border-black/[0.03] bg-white p-4 shadow-sm transition-all hover:border-accent/20 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-2xl">
                  {getPersonEmoji(
                    person.name,
                    plan.people.map((p) => p.name),
                    person.emoji
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-text">{person.name}</h3>
                    {isComplete && (
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        <Check size={10} />
                        Terminé
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <motion.div
                        className={`h-full rounded-full ${isComplete ? "bg-green-500" : "bg-accent"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {checkedItems}/{totalItems}
                    </span>
                  </div>
                </div>
                <ExternalLink
                  size={18}
                  className="shrink-0 text-gray-300 transition-colors group-hover:text-accent"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
