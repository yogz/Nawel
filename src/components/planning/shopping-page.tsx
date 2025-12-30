"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Share2,
  ShoppingBag,
  Copy,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import clsx from "clsx";
import { type Person, type PlanData, type Item, type Ingredient } from "@/lib/types";
import { renderAvatar, getDisplayName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { updateIngredientAction, toggleItemCheckedAction } from "@/app/actions";
import {
  aggregateShoppingList,
  formatAggregatedQuantity,
  type AggregatedShoppingItem,
} from "@/lib/shopping-utils";

interface ShoppingPageProps {
  initialPlan: PlanData;
  person: Person;
  slug: string;
  writeKey?: string;
  writeEnabled: boolean;
}

export function ShoppingPage({
  initialPlan,
  person,
  slug,
  writeKey,
  writeEnabled,
}: ShoppingPageProps) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Build shopping list from person's assigned items
  const shoppingList = useMemo(() => {
    const flatList: {
      type: "ingredient" | "item";
      ingredient?: Ingredient;
      item: Item;
      mealTitle: string;
      serviceTitle: string;
      servicePeopleCount?: number;
    }[] = [];

    plan.meals.forEach((meal) => {
      meal.services.forEach((service) => {
        service.items.forEach((item) => {
          if (item.personId !== person.id) return;

          if (item.ingredients && item.ingredients.length > 0) {
            item.ingredients.forEach((ing) => {
              flatList.push({
                type: "ingredient",
                ingredient: ing,
                item,
                mealTitle: meal.title || meal.date,
                serviceTitle: service.title,
                servicePeopleCount: service.peopleCount,
              });
            });
          } else {
            flatList.push({
              type: "item",
              item,
              mealTitle: meal.title || meal.date,
              serviceTitle: service.title,
              servicePeopleCount: service.peopleCount,
            });
          }
        });
      });
    });

    return aggregateShoppingList(flatList);
  }, [plan.meals, person.id]);

  const checkedCount = shoppingList.filter((item) => item.checked).length;

  const progressPercent =
    shoppingList.length > 0 ? Math.round((checkedCount / shoppingList.length) * 100) : 0;

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggle = (aggregatedItem: AggregatedShoppingItem) => {
    if (!writeEnabled) return;

    startTransition(async () => {
      const newChecked = !aggregatedItem.checked;

      // Optimistic update
      setPlan((prev) => ({
        ...prev,
        meals: prev.meals.map((meal) => ({
          ...meal,
          services: meal.services.map((service) => ({
            ...service,
            items: service.items.map((item) => {
              const matchingSource = aggregatedItem.sources.find((s) => s.item.id === item.id);
              if (!matchingSource) return item;

              if (matchingSource.type === "item") {
                return { ...item, checked: newChecked };
              } else {
                return {
                  ...item,
                  ingredients: item.ingredients?.map((ing) => {
                    const isPartOfGroup = aggregatedItem.sources.some(
                      (s) => s.type === "ingredient" && s.ingredient?.id === ing.id
                    );
                    return isPartOfGroup ? { ...ing, checked: newChecked } : ing;
                  }),
                };
              }
            }),
          })),
        })),
      }));

      const promises = aggregatedItem.sources.map((source) => {
        if (source.type === "ingredient") {
          return updateIngredientAction({
            id: source.ingredient!.id,
            checked: newChecked,
            slug,
            key: writeKey,
          });
        } else {
          return toggleItemCheckedAction({
            id: source.item.id,
            checked: newChecked,
            slug,
            key: writeKey,
          });
        }
      });

      await Promise.all(promises);
    });
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Liste de courses - ${getDisplayName(person)}`,
          text: `Liste de courses de ${getDisplayName(person)} pour ${plan.event?.name || slug}`,
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const backUrl = writeKey ? `/event/${slug}?key=${writeKey}` : `/event/${slug}`;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link
            href={backUrl}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-text"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Retour</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-accent/10 text-lg">
              {(() => {
                const avatar = renderAvatar(
                  person,
                  plan.people.map((p) => p.name)
                );
                if (avatar.type === "image") {
                  return (
                    <img
                      src={avatar.src}
                      alt={getDisplayName(person)}
                      className="h-full w-full object-cover"
                    />
                  );
                }
                return avatar.value;
              })()}
            </div>
            <div>
              <h1 className="text-sm font-semibold text-text">{getDisplayName(person)}</h1>
              <p className="text-xs text-muted-foreground">Liste de courses</p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleShare} aria-label="Partager cette liste">
            {copied ? <CheckCircle size={18} className="text-green-500" /> : <Share2 size={18} />}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Progress card */}
        <div className="mb-6 rounded-2xl border border-white/20 bg-white/80 p-4 shadow-lg backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Progression</p>
              <p className="text-2xl font-bold text-text">
                {checkedCount}/{shoppingList.length}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  article{shoppingList.length > 1 ? "s" : ""}
                </span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-accent">{progressPercent}%</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Shopping list */}
        {shoppingList.length === 0 ? (
          <div className="rounded-2xl border border-white/20 bg-white/80 p-8 text-center shadow-lg backdrop-blur-sm">
            <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-muted-foreground">Aucun article assigné</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shoppingList.map((aggregatedItem, idx) => {
              const isChecked = aggregatedItem.checked;
              const isExpanded = expandedItems.has(aggregatedItem.id);
              const hasMultipleSources = aggregatedItem.sources.length > 1;

              return (
                <div key={aggregatedItem.id} className="space-y-2">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={clsx(
                      "group relative flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all",
                      isChecked
                        ? "border-green-200 bg-green-50 shadow-sm"
                        : "border-white/20 bg-white/80 shadow-sm hover:border-accent/20 hover:bg-accent/5",
                      !writeEnabled && "cursor-default"
                    )}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggle(aggregatedItem)}
                      disabled={isPending || !writeEnabled}
                      aria-label={`${isChecked ? "Décocher" : "Cocher"} ${aggregatedItem.name}`}
                      aria-pressed={isChecked}
                      className={clsx(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all",
                        isChecked ? "border-green-500 bg-green-500 text-white" : "border-gray-300",
                        !writeEnabled && "cursor-default"
                      )}
                    >
                      {isChecked && <Check size={14} strokeWidth={3} />}
                    </button>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-2 overflow-hidden">
                          <span
                            className={clsx(
                              "truncate text-base font-semibold",
                              isChecked ? "text-green-700 line-through" : "text-text"
                            )}
                          >
                            {aggregatedItem.name}
                          </span>
                          {(aggregatedItem.quantity !== null || aggregatedItem.unit) && (
                            <span className="shrink-0 text-sm font-medium text-muted-foreground">
                              {formatAggregatedQuantity(
                                aggregatedItem.quantity,
                                aggregatedItem.unit
                              )}
                            </span>
                          )}
                        </div>

                        {hasMultipleSources && (
                          <button
                            onClick={() => toggleExpanded(aggregatedItem.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/5"
                            aria-label={isExpanded ? "Voir moins" : "Voir les sources"}
                          >
                            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                              <ChevronDown size={14} className="text-muted-foreground" />
                            </motion.div>
                          </button>
                        )}
                      </div>

                      {!isExpanded && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {hasMultipleSources ? (
                            <span className="font-medium text-accent">
                              {aggregatedItem.sources.length} sources
                            </span>
                          ) : (
                            <>
                              {aggregatedItem.sources[0].type === "ingredient" && (
                                <>
                                  <span className="font-medium">
                                    {aggregatedItem.sources[0].item.name}
                                  </span>
                                  {" · "}
                                </>
                              )}
                              {aggregatedItem.sources[0].mealTitle} ·{" "}
                              {aggregatedItem.sources[0].serviceTitle}
                            </>
                          )}
                        </p>
                      )}

                      {/* Expanded View */}
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="mt-3 space-y-2 border-t border-black/5 pt-3"
                        >
                          {aggregatedItem.sources.map((source, sIdx) => (
                            <div key={sIdx} className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-text">
                                  {source.type === "ingredient" ? (
                                    <>
                                      <span className="text-muted-foreground">Dans</span>{" "}
                                      {source.item.name}
                                    </>
                                  ) : (
                                    source.mealTitle
                                  )}
                                </p>
                                <p className="truncate text-[10px] text-muted-foreground">
                                  {source.mealTitle} · {source.serviceTitle}
                                </p>
                              </div>
                              {source.originalQuantity && (
                                <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  {source.originalQuantity}
                                </span>
                              )}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}

        {/* Read-only notice */}
        {!writeEnabled && shoppingList.length > 0 && (
          <div className="mt-6 rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-700">
            Mode lecture seule. Demandez le lien d&apos;édition pour cocher les articles.
          </div>
        )}
      </main>
    </div>
  );
}
