"use client";

import { useEffect, useMemo, useState, useTransition, useRef } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import citationsData from "@/data/citations.json";
import {
  assignItemAction,
  createItemAction,
  createDayAction,
  createMealAction,
  createPersonAction,
  updatePersonAction,
  deletePersonAction,
  deleteItemAction,
  getChangeLogsAction,
  moveItemAction,
  updateItemAction,
  validateWriteKeyAction,
} from "@/app/actions";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { PlanData, Item, Meal, Person, PlanningFilter, Day } from "@/lib/types";
import { TabBar } from "../tab-bar";
import { MealSection } from "./meal-section";
import { BottomSheet } from "../ui/bottom-sheet";
import { Check, ShieldAlert, Sparkles, ChevronDown, Plus as PlusIconLucide, Trash2, ArrowRightLeft, Pencil, Scale, Euro, MessageSquare } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { useThemeMode } from "../theme-provider";
import { getPersonEmoji, PERSON_EMOJIS } from "@/lib/utils";

const tabOrder = ["planning", "people", "settings"] as const;
type SheetState =
  | { type: "item"; mealId: number; item?: Item }
  | { type: "meal"; dayId: number }
  | { type: "person" }
  | { type: "person-select" }
  | { type: "person-edit"; person: Person };

export function Organizer({ initialPlan, slug, writeKey, writeEnabled }: { initialPlan: PlanData; slug: string; writeKey?: string; writeEnabled: boolean }) {
  const [plan, setPlan] = useState(initialPlan);
  const [tab, setTab] = useState<(typeof tabOrder)[number]>("planning");
  const [logs, setLogs] = useState<any[]>([]);
  const [planningFilter, setPlanningFilter] = useState<PlanningFilter>({ type: "all" });
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
  const [readOnly, setReadOnly] = useState(!writeEnabled);
  const [pending, startTransition] = useTransition();
  const { christmas, toggle } = useThemeMode();
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    validateWriteKeyAction({ key: writeKey, slug }).then((ok) => setReadOnly(!ok));
  }, [writeKey, slug, writeEnabled]);

  useEffect(() => {
    if (tab === "settings") {
      setLogsLoading(true);
      getChangeLogsAction({ slug })
        .then(setLogs)
        .finally(() => setLogsLoading(false));
    }
  }, [tab, slug]);

  const setMealItems = (mealId: number, updater: (items: Item[]) => Item[]) => {
    setPlan((prev) => ({
      ...prev,
      days: prev.days.map((day) => ({
        ...day,
        meals: day.meals.map((meal) => (meal.id === mealId ? { ...meal, items: updater(meal.items) } : meal)),
      })),
    }));
  };

  const handleCreateItem = (data: { mealId: number; name: string; quantity?: string; note?: string; price?: number }) => {
    if (readOnly) return;
    startTransition(async () => {
      const created = await createItemAction({ ...data, slug, key: writeKey });
      setMealItems(data.mealId, (items) => [...items, { ...created, person: null }]);
      setSheet(null);
    });
  };

  const handleUpdateItem = (item: Item, closeSheet = false) => {
    if (readOnly) return;
    startTransition(async () => {
      await updateItemAction({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        note: item.note,
        price: item.price ?? null,
        personId: item.personId ?? null,
        slug,
        key: writeKey,
      });
      setMealItems(item.mealId, (items) => items.map((it) => (it.id === item.id ? item : it)));
      if (closeSheet) {
        setSheet(null);
      }
      // Don't update the sheet item during auto-save to avoid re-rendering and losing focus
    });
  };

  const handleAssign = (item: Item, personId: number | null) => {
    if (readOnly) return;

    // Optimistic UI: update immediately for instant feedback
    setMealItems(item.mealId, (items) =>
      items.map((it) => (it.id === item.id ? { ...it, personId, person: personId ? plan.people.find(p => p.id === personId) : null } : it))
    );
    setSheet(null);
    const person = personId ? plan.people.find((p) => p.id === personId) : null;
    const personName = person?.name || "À prévoir";
    setSuccessMessage(`Article assigné à ${personName} ✓`);
    setTimeout(() => setSuccessMessage(null), 3000);

    // Special effect for Cécile
    if (person && (person.name.toLowerCase() === "cécile" || person.name.toLowerCase() === "cecile")) {
      const duration = 4 * 1000;
      const end = Date.now() + duration;
      const emojis = ['❤️', '💖', '💕', '🥂', '🌸', '🌺', '🌷', '✨'];
      const emojiShapes = emojis.map(e => confetti.shapeFromText({ text: e })) as any;

      const frame = () => {
        // Cannon left
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          shapes: emojiShapes,
          scalar: 2.5,
        });

        // Cannon right
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          shapes: emojiShapes,
          scalar: 2.5,
        });

        // Center burst
        if (Math.random() > 0.7) {
          confetti({
            particleCount: 4,
            spread: 120,
            origin: { y: 0.6 },
            shapes: emojiShapes,
            scalar: 3.5
          });
        }

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }

    // Server sync in background
    startTransition(async () => {
      await assignItemAction({ id: item.id, personId, slug, key: writeKey });
    });
  };

  const handleDelete = (item: Item) => {
    if (readOnly) return;

    // Optimistic UI: remove immediately
    setMealItems(item.mealId, (items) => items.filter((i) => i.id !== item.id));

    // Server sync in background
    startTransition(async () => {
      await deleteItemAction({ id: item.id, slug, key: writeKey });
    });
  };


  const findItem = (itemId: number): { item: Item; meal: Meal; dayId: number } | null => {
    for (const day of plan.days) {
      for (const meal of day.meals) {
        const item = meal.items.find((i) => i.id === itemId);
        if (item) return { item, meal, dayId: day.id };
      }
    }
    return null;
  };

  const handleMoveItem = (itemId: number, targetMealId: number, targetOrder?: number) => {
    if (readOnly) return;
    const found = findItem(itemId);
    if (!found) return;

    const { item, meal: sourceMeal } = found;
    if (sourceMeal.id === targetMealId) {
      // Same meal, just reorder
      return;
    }

    startTransition(async () => {
      // Optimistic update
      const targetMeal = plan.days
        .flatMap((d) => d.meals)
        .find((m) => m.id === targetMealId);
      if (!targetMeal) return;

      // Remove from source meal
      setMealItems(sourceMeal.id, (items) => items.filter((i) => i.id !== itemId));
      // Add to target meal
      setMealItems(targetMealId, (items) => {
        const newItems = [...items, { ...item, mealId: targetMealId }];
        if (targetOrder !== undefined && targetOrder < newItems.length) {
          // Reorder to insert at targetOrder
          const [moved] = newItems.splice(newItems.length - 1, 1);
          newItems.splice(targetOrder, 0, moved);
        }
        return newItems;
      });

      await moveItemAction({ itemId, targetMealId, targetOrder, slug, key: writeKey });
    });
  };

  const handleCreateDay = async (date: string, title?: string): Promise<number> => {
    if (readOnly) return 0;
    const created = await createDayAction({ date, title, slug, key: writeKey });
    setPlan((prev) => ({
      ...prev,
      days: [...prev.days, { ...created, meals: [] }],
    }));
    return created.id;
  };

  const handleCreateMeal = (dayId: number, title: string) => {
    if (readOnly) return;
    startTransition(async () => {
      const created = await createMealAction({ dayId, title, slug, key: writeKey });
      setPlan((prev) => ({
        ...prev,
        days: prev.days.map((d) => (d.id === dayId ? { ...d, meals: [...d.meals, { ...created, items: [] }] } : d)),
      }));
      setSheet(null);
    });
  };

  const handleCreatePerson = (name: string, emoji?: string | null) => {
    if (readOnly) return;
    startTransition(async () => {
      try {
        const created = await createPersonAction({ name, emoji: emoji ?? undefined, slug, key: writeKey });
        setPlan((prev) => ({
          ...prev,
          people: [...prev.people, created].sort((a, b) => a.name.localeCompare(b.name))
        }));
        setSelectedPerson(created.id);
        setSheet(null);
        setSuccessMessage(`${name} a été ajouté(e) aux convives ✨`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        console.error("Failed to create person:", error);
        alert("Erreur lors de l'ajout du convive. Vérifiez votre clé d'accès ou réessayez plus tard.");
      }
    });
  };

  const handleUpdatePerson = (id: number, name: string, emoji: string | null) => {
    if (readOnly) return;
    startTransition(async () => {
      await updatePersonAction({ id, name, emoji, slug, key: writeKey });
      setPlan((prev) => ({
        ...prev,
        people: prev.people.map((p) => (p.id === id ? { ...p, name, emoji } : p)),
      }));
      setSheet(null);
    });
  };

  const handleDeletePerson = (id: number) => {
    if (readOnly) return;
    startTransition(async () => {
      if (!confirm("Es-tu sûr de vouloir supprimer ce convive ? Tous ses articles deviendront 'À prévoir'.")) return;
      await deletePersonAction({ id, slug, key: writeKey });
      setPlan((prev) => ({
        ...prev,
        people: prev.people.filter((p) => p.id !== id),
        days: prev.days.map((day) => ({
          ...day,
          meals: day.meals.map((meal) => ({
            ...meal,
            items: meal.items.map((item) => (item.personId === id ? { ...item, personId: null, person: null } : item)),
          })),
        })),
      }));
      if (selectedPerson === id) setSelectedPerson(null);
      setSheet(null);
    });
  };

  const unassignedItemsCount = useMemo(() => {
    let count = 0;
    plan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        meal.items.forEach((item) => {
          if (!item.personId) count++;
        });
      });
    });
    return count;
  }, [plan.days]);

  const itemsForPerson = useMemo(() => {
    const list: Array<{ item: Item; meal: Meal; dayTitle: string }> = [];
    if (!selectedPerson) return list;
    plan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        meal.items.forEach((item) => {
          if (item.personId === selectedPerson) list.push({ item, meal, dayTitle: day.title || day.date });
        });
      });
    });
    return list;
  }, [plan.days, selectedPerson]);

  const itemsByPerson = useMemo(() => {
    const byPerson: Record<number, Array<{ item: Item; meal: Meal; dayTitle: string }>> = {};
    plan.people.forEach((person) => {
      byPerson[person.id] = [];
    });
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
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col pb-24">
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
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-24 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
          >
            <div className="rounded-full px-5 py-2.5 shadow-xl bg-gray-900/95 backdrop-blur-sm border border-white/10 pointer-events-auto">
              <div className="flex items-center gap-2.5 text-white">
                {christmas ? (
                  <>
                    <span className="text-base">🎄</span>
                    <span className="font-semibold text-sm">{successMessage}</span>
                    <span className="text-base">✨</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500">
                      <Check size={12} strokeWidth={3} className="text-white" />
                    </div>
                    <span className="font-semibold text-sm">{successMessage}</span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md px-4 py-4 border-b border-black/[0.03]">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-black italic tracking-tight text-accent hover:opacity-80 transition-opacity">
            NAWEL ✨
          </Link>
          <div className="flex items-center gap-2">
            {!readOnly ? (
              <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-green-700">
                <Check size={12} /> Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                <ShieldAlert size={12} /> Miroir
              </span>
            )}
          </div>
        </div>
        {tab === "planning" && (
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
                    onClick={() => setSheet({ type: "person-select" } as any)}
                    className={clsx(
                      "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all",
                      planningFilter.type === "person"
                        ? "bg-accent text-white shadow-md ring-2 ring-accent/20"
                        : "bg-white text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {planningFilter.type === "person" ? (
                      <>
                        {getPersonEmoji(plan.people.find(p => p.id === planningFilter.personId)?.name || "", plan.people.map(p => p.name), plan.people.find(p => p.id === planningFilter.personId)?.emoji)}{" "}
                        {plan.people.find(p => p.id === planningFilter.personId)?.name}
                      </>
                    ) : (
                      "Par personne"
                    )}
                    <ChevronDown size={14} className={clsx("transition-transform", sheet?.type === "person-select" && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {sheet?.type === "person-select" && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setSheet(null)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute left-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-black/5"
                        >
                          <div className="max-h-64 overflow-y-auto no-scrollbar">
                            <button
                              onClick={() => {
                                setPlanningFilter({ type: "all" });
                                setSheet(null);
                              }}
                              className={clsx(
                                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                                planningFilter.type === "all"
                                  ? "bg-accent/10 text-accent"
                                  : "text-gray-600 hover:bg-gray-50"
                              )}
                            >
                              <span>Tout le monde</span>
                              {planningFilter.type === "all" && (
                                <Check size={14} className="ml-auto" />
                              )}
                            </button>
                            {plan.people.map((person) => (
                              <button
                                key={person.id}
                                onClick={() => {
                                  setPlanningFilter({ type: "person", personId: person.id });
                                  setSheet(null);
                                }}
                                className={clsx(
                                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                                  planningFilter.type === "person" && planningFilter.personId === person.id
                                    ? "bg-accent/10 text-accent"
                                    : "text-gray-600 hover:bg-gray-50"
                                )}
                              >
                                <span>{getPersonEmoji(person.name, plan.people.map(p => p.name), person.emoji)}</span>
                                <span className="truncate">{person.name}</span>
                                {planningFilter.type === "person" && planningFilter.personId === person.id && (
                                  <Check size={14} className="ml-auto" />
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 space-y-4 px-4 py-8">
        {tab === "planning" && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event: DragStartEvent) => {
              if (typeof event.active.id === "number") {
                setActiveItemId(event.active.id);
              }
            }}
            onDragEnd={(event: DragEndEvent) => {
              setActiveItemId(null);
              const { active, over } = event;
              if (!over || !active.id) return;

              const itemId = Number(active.id);
              const found = findItem(itemId);
              if (!found) return;

              // Check if dropped on a meal (droppable)
              if (typeof over.id === "string" && over.id.startsWith("meal-")) {
                const targetMealId = Number(over.id.replace("meal-", ""));
                if (targetMealId !== found.meal.id) {
                  handleMoveItem(itemId, targetMealId);
                }
                return;
              }

              // Check if dropped on another item (move to different meal only)
              if (typeof over.id === "number") {
                const targetItem = findItem(over.id);
                if (!targetItem) return;

                // Only allow moving to a different meal, not reordering within same meal
                if (targetItem.meal.id !== found.meal.id) {
                  const targetIndex = targetItem.meal.items.findIndex((i) => i.id === over.id);
                  handleMoveItem(itemId, targetItem.meal.id, targetIndex);
                }
              }
            }}
          >
            <div className="space-y-12">
              {plan.days.map((day) => {
                const hasMatch = day.meals.some(m => m.items.some(i => {
                  if (planningFilter.type === "all") return true;
                  if (planningFilter.type === "unassigned") return !i.personId;
                  if (planningFilter.type === "person") return i.personId === planningFilter.personId;
                  return false;
                }));
                if (planningFilter.type !== "all" && !hasMatch) return null;


                return (
                  <div key={day.id} className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                      <div className="h-10 w-10 shrink-0 grid place-items-center rounded-2xl bg-accent text-white shadow-lg ring-4 ring-accent/10">
                        <span className="text-lg font-bold">🎄</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-black tracking-tight text-text">
                          {day.title || day.date}
                        </h2>
                        <CitationDisplay />
                      </div>
                    </div>
                    <div className="space-y-6">
                      {day.meals.map((meal) => (
                        <MealSection
                          key={meal.id}
                          meal={meal}
                          people={plan.people}
                          readOnly={readOnly}
                          onAssign={(item) => setSheet({ type: "item", mealId: meal.id, item })}
                          onDelete={handleDelete}
                          onCreate={() => setSheet({ type: "item", mealId: meal.id })}
                          filter={planningFilter}
                          activeItemId={activeItemId}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {plan.days.length === 0 && planningFilter.type === "all" && (
              <div className="px-4 py-8 text-center">
                <p className="text-gray-500 mb-4">Aucun jour pour l&apos;instant.</p>
                {!readOnly && (
                  <button
                    onClick={() => {
                      setSheet({ type: "meal", dayId: -1 });
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white/50 px-4 py-4 text-sm font-semibold text-gray-600 hover:bg-white/80 transition-colors"
                  >
                    <PlusIcon />
                    Créer un jour et un repas
                  </button>
                )}
              </div>
            )}
            {!readOnly && planningFilter.type === "all" && plan.days.length > 0 && (
              <div className="mt-8 px-4">
                <button
                  onClick={() => {
                    // Use the first day by default, or let user choose
                    const firstDay = plan.days[0];
                    if (firstDay) {
                      setSheet({ type: "meal", dayId: firstDay.id });
                    }
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white/50 px-4 py-4 text-sm font-semibold text-gray-600 hover:bg-white/80 transition-colors"
                >
                  <PlusIcon />
                  Ajouter un repas
                </button>
              </div>
            )}
          </DndContext>
        )}

        {tab === "people" && (
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
                    <span className="mr-1.5">{getPersonEmoji(person.name, plan.people.map(p => p.name), person.emoji)}</span>
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
                          ? "hover:bg-white/20 text-white/80 hover:text-white"
                          : "hover:bg-gray-100 text-gray-400 hover:text-accent"
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
            {selectedPerson === null ? (
              // Vue "Tout le monde" - afficher tous les articles groupés par personne
              <div className="space-y-8">
                {plan.people.map((person) => {
                  const personItems = itemsByPerson[person.id] || [];
                  if (personItems.length === 0) return null;
                  return (
                    <div key={person.id} className="space-y-3">
                      <div className="sticky top-[72px] z-20 -mx-4 px-4 py-3 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 backdrop-blur-sm border-y border-accent/20">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-2xl shadow-sm ring-2 ring-accent/20">
                            {getPersonEmoji(person.name, plan.people.map(p => p.name), person.emoji)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-black tracking-tight text-text">{person.name}</h3>
                              {!readOnly && (
                                <button
                                  onClick={() => setSheet({ type: "person-edit", person })}
                                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-accent transition-colors"
                                >
                                  <motion.div whileHover={{ rotate: 15 }}>
                                    <Sparkles size={16} />
                                  </motion.div>
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
                        {personItems.map(({ item, meal, dayTitle }) => (
                          <div key={item.id} className="premium-card p-5 relative group hover:border-accent/10 transition-all">
                            <p className="text-[10px] uppercase font-black tracking-widest text-accent/60 mb-1">{dayTitle} • {meal.title}</p>
                            <p className="text-base font-bold text-text">{item.name}</p>

                            {(item.quantity || item.note || item.price) && (
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                                {item.quantity && (
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                                    <Scale size={12} className="text-gray-400" />
                                    {item.quantity}
                                  </div>
                                )}
                                {item.price && (
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-green-600 uppercase tracking-tight">
                                    <Euro size={12} className="text-green-500" />
                                    {item.price.toFixed(2)} €
                                  </div>
                                )}
                                {item.note && (
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 italic tracking-tight">
                                    <MessageSquare size={12} className="text-gray-400" />
                                    {item.note}
                                  </div>
                                )}
                              </div>
                            )}

                            {!readOnly && (
                              <button
                                onClick={() => handleAssign(item, null)}
                                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700 hover:bg-amber-500 hover:text-white shadow-sm"
                                title="Retirer l'assignation"
                              >
                                <ArrowRightLeft size={12} />
                                Retirer
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {Object.values(itemsByPerson).every(items => items.length === 0) && (
                  <p className="text-sm text-gray-500">Aucun article assigné pour l&apos;instant.</p>
                )}
              </div>
            ) : (
              // Vue individuelle - afficher les articles d'une seule personne
              itemsForPerson.length === 0 ? (
                <p className="text-sm text-gray-500">Rien de prévu pour l&apos;instant.</p>
              ) : (
                <div className="space-y-2">
                  {itemsForPerson.map(({ item, meal, dayTitle }) => (
                    <div key={item.id} className="premium-card p-5 relative group hover:border-accent/10 transition-all">
                      <p className="text-[10px] uppercase font-black tracking-widest text-accent/60 mb-1">{dayTitle} • {meal.title}</p>
                      <p className="text-base font-bold text-text">{item.name}</p>

                      {(item.quantity || item.note || item.price) && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {item.quantity && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                              <Scale size={12} className="text-gray-400" />
                              {item.quantity}
                            </div>
                          )}
                          {item.price && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-green-600 uppercase tracking-tight">
                              <Euro size={12} className="text-green-500" />
                              {item.price.toFixed(2)} €
                            </div>
                          )}
                          {item.note && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 italic tracking-tight">
                              <MessageSquare size={12} className="text-gray-400" />
                              {item.note}
                            </div>
                          )}
                        </div>
                      )}

                      {!readOnly && (
                        <button
                          onClick={() => handleAssign(item, null)}
                          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700 hover:bg-amber-500 hover:text-white shadow-sm"
                          title="Retirer l'assignation"
                        >
                          <ArrowRightLeft size={12} />
                          Retirer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Thème de Noël</p>
                  <p className="text-sm text-gray-500">Accents festifs subtils</p>
                </div>
                <button
                  onClick={toggle}
                  className={clsx(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm",
                    christmas ? "bg-accent text-white" : "bg-gray-100 text-gray-700"
                  )}
                >
                  <Sparkles size={16} /> Thème Noël : {christmas ? "Oui" : "Non"}
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="rounded-xl bg-accent-soft p-3 text-sm text-accent">
                Partagez ce lien avec la famille. Gardez la clé pour les éditeurs.
                <div className="mt-2 break-all text-xs text-gray-600">
                  {typeof window !== "undefined" ? window.location.href : "Ajouter ?key=..."}
                </div>
              </div>
              {!readOnly ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
                  <Check size={16} />
                  Mode édition activé avec succès.
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                  <ShieldAlert size={16} />
                  Ajouter ?key=... pour modifier.
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-bold">Historique des modifications</h2>
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-gray-500">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-accent"></div>
                    <span className="text-sm">Chargement de l&apos;historique...</span>
                  </div>
                </div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun changement enregistré pour l&apos;instant.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => {
                    const actionColors = {
                      create: "bg-green-500",
                      update: "bg-blue-500",
                      delete: "bg-red-500",
                    };
                    const actionIcons = {
                      create: "➕",
                      update: "✏️",
                      delete: "🗑️",
                    };
                    const actionLabels = {
                      create: "Créé",
                      update: "Modifié",
                      delete: "Supprimé",
                    };
                    const tableLabels = {
                      items: "Article",
                      meals: "Repas",
                      people: "Personne",
                      days: "Jour",
                    };
                    const date = new Date(log.createdAt);
                    const formattedDate = date.toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const formattedTime = date.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    // Extraire les changements importants
                    const getChanges = () => {
                      if (log.action === "create" && log.newData) {
                        const data = log.newData;
                        if (log.tableName === "items") {
                          const parts = [];
                          if (data.quantity) parts.push(data.quantity);
                          if (data.price) parts.push(`${data.price.toFixed(2)} €`);
                          return `"${data.name || ""}"${parts.length > 0 ? ` (${parts.join(", ")})` : ""}`;
                        } else if (log.tableName === "meals") {
                          return `"${data.title || ""}"`;
                        } else if (log.tableName === "people") {
                          return `"${data.name || ""}"`;
                        } else if (log.tableName === "days") {
                          return `"${data.title || data.date || ""}"`;
                        }
                      } else if (log.action === "update" && log.oldData && log.newData) {
                        const changes: string[] = [];
                        const old = log.oldData;
                        const new_ = log.newData;
                        if (old.name !== new_.name) changes.push(`Nom: "${old.name || ""}" → "${new_.name || ""}"`);
                        if (old.title !== new_.title) changes.push(`Titre: "${old.title || ""}" → "${new_.title || ""}"`);
                        if (old.quantity !== new_.quantity) changes.push(`Quantité: "${old.quantity || ""}" → "${new_.quantity || ""}"`);
                        if (old.price !== new_.price) {
                          const oldPrice = old.price ? `${old.price.toFixed(2)} €` : "—";
                          const newPrice = new_.price ? `${new_.price.toFixed(2)} €` : "—";
                          changes.push(`Prix: ${oldPrice} → ${newPrice}`);
                        }
                        if (old.note !== new_.note) changes.push(`Note: "${old.note || ""}" → "${new_.note || ""}"`);
                        if (old.personId !== new_.personId) {
                          const oldPerson = plan.people.find((p) => p.id === old.personId);
                          const newPerson = plan.people.find((p) => p.id === new_.personId);
                          changes.push(`Assigné: ${oldPerson?.name || "Personne"} → ${newPerson?.name || "Personne"}`);
                        }
                        return changes.length > 0 ? changes.join(", ") : "Modifications";
                      } else if (log.action === "delete" && log.oldData) {
                        const data = log.oldData;
                        if (log.tableName === "items") {
                          return `"${data.name || ""}"`;
                        } else if (log.tableName === "meals") {
                          return `"${data.title || ""}"`;
                        } else if (log.tableName === "people") {
                          return `"${data.name || ""}"`;
                        } else if (log.tableName === "days") {
                          return `"${data.title || data.date || ""}"`;
                        }
                      }
                      return "";
                    };

                    const changes = getChanges();
                    const userAgentShort = log.userAgent
                      ? log.userAgent
                        .replace(/Mozilla\/[\d.]+ \(([^)]+)\)[^/]*\/([^ ]+)/, "$1 / $2")
                        .substring(0, 40)
                      : null;

                    // Extraire le nom de l'élément pour l'affichage
                    const getItemName = () => {
                      if (log.tableName === "items") {
                        if (log.newData?.name) return log.newData.name;
                        if (log.oldData?.name) return log.oldData.name;
                      } else if (log.tableName === "meals") {
                        if (log.newData?.title) return log.newData.title;
                        if (log.oldData?.title) return log.oldData.title;
                      } else if (log.tableName === "people") {
                        if (log.newData?.name) return log.newData.name;
                        if (log.oldData?.name) return log.oldData.name;
                      } else if (log.tableName === "days") {
                        if (log.newData?.title) return log.newData.title;
                        if (log.oldData?.title) return log.oldData.title;
                        if (log.newData?.date) return log.newData.date;
                        if (log.oldData?.date) return log.oldData.date;
                      }
                      return null;
                    };

                    const itemName = getItemName();
                    const displayTitle = itemName
                      ? `${actionLabels[log.action as keyof typeof actionLabels]} "${itemName}"`
                      : `${actionLabels[log.action as keyof typeof actionLabels]} ${tableLabels[log.tableName as keyof typeof tableLabels]}`;

                    return (
                      <div key={log.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className={clsx("mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs text-white", actionColors[log.action as keyof typeof actionColors])}>
                            {actionIcons[log.action as keyof typeof actionIcons]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-gray-700">
                                {displayTitle}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">{formattedTime}</span>
                            </div>
                            {changes && (
                              <div className="text-xs text-gray-600 mb-1 truncate" title={changes}>
                                {changes}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              {log.userIp && <span>🌐 {log.userIp}</span>}
                              {userAgentShort && <span>💻 {userAgentShort}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <TabBar active={tab} onChange={(t) => setTab(t)} />

      <BottomSheet
        open={sheet?.type === "item"}
        onClose={() => setSheet(null)}
        title={sheet?.type === "item" && sheet.item ? "Modifier l'article" : "Ajouter un article"}
      >
        {sheet?.type === "item" && (
          <ItemForm
            people={plan.people}
            defaultItem={sheet.item}
            allMeals={plan.days.flatMap((day) => day.meals.map((meal) => ({ ...meal, dayTitle: day.title || day.date })))}
            currentMealId={sheet.mealId}
            onSubmit={(values) => {
              if (sheet.type !== "item") return;
              if (sheet.item) {
                handleUpdateItem({ ...sheet.item, ...values }, false);
              } else {
                handleCreateItem({ ...values, mealId: sheet.mealId });
              }
            }}
            onAssign={(personId) => {
              if (sheet.type === "item" && sheet.item) {
                handleAssign(sheet.item, personId);
              }
            }}
            onMoveMeal={(targetMealId) => {
              if (sheet.type === "item" && sheet.item) {
                handleMoveItem(sheet.item.id, targetMealId);
                setSheet(null);
              }
            }}
            onDelete={() => {
              if (sheet.type === "item" && sheet.item) {
                handleDelete(sheet.item);
                setSheet(null);
              }
            }}
            readOnly={readOnly}
          />
        )}
      </BottomSheet>

      <BottomSheet open={sheet?.type === "meal"} onClose={() => setSheet(null)} title={plan.days.length === 0 ? "Créer un jour et un repas" : "Ajouter un repas"}>
        {sheet?.type === "meal" && (
          <MealForm
            days={plan.days}
            defaultDayId={sheet.dayId === -1 ? undefined : sheet.dayId}
            forceNewDay={sheet.dayId === -1 || plan.days.length === 0}
            onSubmit={async (dayIdOrNew, title, newDayDate?, newDayTitle?) => {
              if (readOnly) return;
              startTransition(async () => {
                let dayId = dayIdOrNew;
                if (dayIdOrNew === -1 && newDayDate) {
                  // Create new day first
                  dayId = await handleCreateDay(newDayDate, newDayTitle);
                }
                if (dayId > 0) {
                  handleCreateMeal(dayId, title);
                }
              });
            }}
            readOnly={readOnly}
          />
        )}
      </BottomSheet>

      <BottomSheet open={sheet?.type === "person"} onClose={() => setSheet(null)} title="Ajouter un membre">
        {sheet?.type === "person" && <PersonForm onSubmit={(name) => handleCreatePerson(name)} readOnly={readOnly} />}
      </BottomSheet>

      <BottomSheet open={sheet?.type === "person-edit"} onClose={() => setSheet(null)} title="Modifier un membre">
        {sheet?.type === "person-edit" && (
          <PersonEditForm
            person={sheet.person}
            allPeople={plan.people}
            onSubmit={(name, emoji) => handleUpdatePerson(sheet.person.id, name, emoji)}
            onDelete={() => handleDeletePerson(sheet.person.id)}
            readOnly={readOnly}
          />
        )}
      </BottomSheet>
    </div >
  );
}

function ItemForm({
  people,
  defaultItem,
  allMeals,
  currentMealId,
  onSubmit,
  onAssign,
  onMoveMeal,
  onDelete,
  readOnly,
}: {
  people: Person[];
  defaultItem?: Item;
  allMeals?: Array<Meal & { dayTitle: string }>;
  currentMealId?: number;
  onSubmit: (values: { name: string; quantity?: string; note?: string; price?: number }) => void;
  onAssign: (personId: number | null) => void;
  onMoveMeal?: (targetMealId: number) => void;
  onDelete?: () => void;
  readOnly?: boolean;
}) {
  const [name, setName] = useState(defaultItem?.name ?? "");
  const [quantity, setQuantity] = useState(defaultItem?.quantity ?? "");
  const [note, setNote] = useState(defaultItem?.note ?? "");
  const [price, setPrice] = useState<number | undefined>(defaultItem?.price ?? undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveMeal, setShowMoveMeal] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = useRef(true);
  const lastSavedRef = useRef<{ name: string; quantity: string; note: string; price: number | undefined } | null>(null);
  const currentItemIdRef = useRef<number | undefined>(defaultItem?.id);

  // Sync with defaultItem only on initial mount or when defaultItem.id changes
  useEffect(() => {
    if (defaultItem) {
      // Only sync if it's a different item (different ID) or initial mount
      if (isInitialMountRef.current || defaultItem.id !== currentItemIdRef.current) {
        setName(defaultItem.name ?? "");
        setQuantity(defaultItem.quantity ?? "");
        setNote(defaultItem.note ?? "");
        setPrice(defaultItem.price ?? undefined);
        lastSavedRef.current = {
          name: defaultItem.name ?? "",
          quantity: defaultItem.quantity ?? "",
          note: defaultItem.note ?? "",
          price: defaultItem.price ?? undefined,
        };
        currentItemIdRef.current = defaultItem.id;
        isInitialMountRef.current = false;
      }
    }
  }, [defaultItem?.id]);

  // Auto-save on change (only for existing items)
  useEffect(() => {
    if (!defaultItem || readOnly || isInitialMountRef.current) return;

    // Don't save if values haven't changed from last saved state
    if (lastSavedRef.current &&
      name === lastSavedRef.current.name &&
      quantity === lastSavedRef.current.quantity &&
      note === lastSavedRef.current.note &&
      price === lastSavedRef.current.price) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Save after 1000ms of no changes (increased from 500ms to avoid conflicts)
    saveTimeoutRef.current = setTimeout(() => {
      if (defaultItem && lastSavedRef.current &&
        (name !== lastSavedRef.current.name ||
          quantity !== lastSavedRef.current.quantity ||
          note !== lastSavedRef.current.note ||
          price !== lastSavedRef.current.price)) {
        onSubmit({ name, quantity, note, price });
        lastSavedRef.current = { name, quantity, note, price };
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [name, quantity, note, price, defaultItem, readOnly, onSubmit]);

  return (
    <form
      className="space-y-2.5 sm:space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, quantity, note, price });
      }}
    >
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Article</span>
        <input
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-base sm:text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Plateau de fromages"
          required
          disabled={readOnly}
        />
      </label>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Quantité</span>
          <input
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-base sm:text-sm"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="ex. 2 plateaux"
            disabled={readOnly}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Prix (€)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-base sm:text-sm"
            value={price ?? ""}
            onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="ex. 15.50"
            disabled={readOnly}
          />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Remarque</span>
        <input
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-base sm:text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Sans gluten"
          disabled={readOnly}
        />
      </label>
      {defaultItem && (
        <div className="space-y-1.5 sm:space-y-2">
          <p className="text-xs sm:text-sm font-semibold text-gray-600">Assigner à</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                onAssign(null);
              }}
              disabled={readOnly}
              title="À prévoir"
              className={clsx(
                "rounded-full px-2 sm:px-2.5 py-1 text-base sm:text-lg transition-colors",
                !defaultItem.personId ? "bg-accent text-white" : "bg-gray-100 text-gray-600"
              )}
            >
              ❓
            </button>
            {people.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => {
                  onAssign(person.id);
                }}
                disabled={readOnly}
                className={clsx(
                  "rounded-full px-2.5 sm:px-3 py-1 text-xs sm:text-sm transition-colors",
                  person.id === defaultItem.personId ? "bg-accent text-white" : "bg-gray-100"
                )}
              >
                {getPersonEmoji(person.name, people.map(p => p.name))} {person.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {defaultItem && allMeals && onMoveMeal && (
        <div className="space-y-1.5 sm:space-y-2 border-t border-gray-200 pt-2.5 sm:pt-3">
          <button
            type="button"
            onClick={() => setShowMoveMeal(!showMoveMeal)}
            className="w-full flex items-center justify-between text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors py-1"
          >
            <span className="flex items-center gap-1.5 sm:gap-2">
              <ArrowRightLeft size={14} className="sm:w-4 sm:h-4" />
              Changer de repas
            </span>
            <ChevronDown
              size={14}
              className={clsx("transition-transform sm:w-4 sm:h-4", showMoveMeal && "rotate-180")}
            />
          </button>
          {showMoveMeal && (
            <div className="max-h-40 sm:max-h-48 overflow-y-auto space-y-1 pt-1.5 sm:pt-2">
              {allMeals
                .filter((meal) => meal.id !== currentMealId)
                .map((meal) => (
                  <button
                    key={meal.id}
                    type="button"
                    onClick={() => onMoveMeal(meal.id)}
                    disabled={readOnly}
                    className="w-full rounded-xl bg-gray-50 px-2.5 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    <div className="font-semibold">{meal.title}</div>
                    <div className="text-xs text-gray-500">{meal.dayTitle}</div>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
      {defaultItem && onDelete && (
        <div className="space-y-1.5 sm:space-y-2 border-t border-gray-200 pt-2.5 sm:pt-3">
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={readOnly}
              className="w-full flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl bg-red-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} className="sm:w-4 sm:h-4" />
              Supprimer l&apos;article
            </button>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm font-semibold text-red-600 text-center">
                Êtes-vous sûr de vouloir supprimer cet article ?
              </p>
              <div className="flex gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onDelete();
                    setShowDeleteConfirm(false);
                  }}
                  disabled={readOnly}
                  className="flex-1 rounded-xl bg-red-600 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Oui, supprimer
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-xl bg-gray-100 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {!defaultItem && (
        <button
          type="submit"
          disabled={readOnly}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm active:scale-95 disabled:opacity-50"
        >
          Ajouter au menu
        </button>
      )}
      {defaultItem && (
        <div className="text-[10px] sm:text-xs text-center text-gray-500 pt-1 sm:pt-2">
          Les modifications sont sauvegardées automatiquement
        </div>
      )}
    </form>
  );
}

function MealForm({
  days,
  defaultDayId,
  forceNewDay,
  onSubmit,
  readOnly,
}: {
  days: Day[];
  defaultDayId?: number;
  forceNewDay?: boolean;
  onSubmit: (dayId: number, title: string, newDayDate?: string, newDayTitle?: string) => Promise<void>;
  readOnly?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [selectedDayId, setSelectedDayId] = useState<number>(defaultDayId ?? days[0]?.id ?? 0);
  const [isNewDay, setIsNewDay] = useState(forceNewDay ?? false);
  const [newDayDate, setNewDayDate] = useState("");
  const [newDayTitle, setNewDayTitle] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (isNewDay) {
          await onSubmit(-1, title, newDayDate, newDayTitle);
        } else {
          await onSubmit(selectedDayId, title);
        }
      }}
    >
      {days.length > 0 && (
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Jour</span>
          <select
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-base sm:text-sm"
            value={isNewDay ? -1 : selectedDayId}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value === -1) {
                setIsNewDay(true);
              } else {
                setIsNewDay(false);
                setSelectedDayId(value);
              }
            }}
            required
            disabled={readOnly}
          >
            {days.map((day) => (
              <option key={day.id} value={day.id}>
                {day.title || day.date}
              </option>
            ))}
            <option value={-1}>+ Nouveau jour</option>
          </select>
        </label>
      )}
      {isNewDay && (
        <>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Date du jour</span>
            <input
              type="date"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-base sm:text-sm"
              value={newDayDate}
              onChange={(e) => setNewDayDate(e.target.value)}
              required
              disabled={readOnly}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Titre du jour (optionnel)</span>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-base sm:text-sm"
              value={newDayTitle}
              onChange={(e) => setNewDayTitle(e.target.value)}
              placeholder="Jour de Noël"
              disabled={readOnly}
            />
          </label>
        </>
      )}
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Titre du repas</span>
        <input
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-base sm:text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Dessert"
          required
          disabled={readOnly}
        />
      </label>
      <button
        type="submit"
        disabled={readOnly}
        className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm active:scale-95 disabled:opacity-50"
      >
        Enregistrer
      </button>
    </form>
  );
}

function PersonForm({ onSubmit, readOnly }: { onSubmit: (name: string) => void; readOnly?: boolean }) {
  const [name, setName] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(name);
      }}
    >
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Nom</span>
        <input
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-base sm:text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du membre"
          required
          autoFocus
          disabled={readOnly}
        />
      </label>
      <button
        type="submit"
        disabled={readOnly || !name.trim()}
        className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm active:scale-95 disabled:opacity-50"
      >
        Ajouter le membre
      </button>
    </form>
  );
}

function PersonEditForm({
  person,
  allPeople,
  onSubmit,
  onDelete,
  readOnly,
}: {
  person: Person;
  allPeople: Person[];
  onSubmit: (name: string, emoji: string | null) => void;
  onDelete: () => void;
  readOnly?: boolean;
}) {
  const [name, setName] = useState(person.name);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(person.emoji);
  const currentEmoji = getPersonEmoji(person.name, allPeople.map(p => p.name), person.emoji);

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(name, selectedEmoji);
        }}
      >
        <div className="flex justify-center py-4">
          <div className="h-20 w-20 flex items-center justify-center rounded-3xl bg-accent/10 text-4xl shadow-sm ring-4 ring-accent/5">
            {selectedEmoji || currentEmoji}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-gray-700">Nom du convive</span>
          <input
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du membre"
            required
            disabled={readOnly}
          />
        </label>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Choisir un emoji</span>
          <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto no-scrollbar p-1">
            <button
              type="button"
              onClick={() => setSelectedEmoji(null)}
              className={clsx(
                "h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                selectedEmoji === null ? "bg-accent text-white scale-110 shadow-md" : "bg-gray-50 hover:bg-gray-100"
              )}
            >
              🔄
            </button>
            {PERSON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setSelectedEmoji(emoji)}
                className={clsx(
                  "h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                  selectedEmoji === emoji ? "bg-accent scale-110 shadow-md" : "bg-gray-50 hover:bg-gray-100"
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 italic">
            🔄 utilise l&apos;emoji automatique basé sur le nom.
          </p>
        </div>

        <button
          type="submit"
          disabled={readOnly || !name.trim()}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg active:scale-95 disabled:opacity-50 transition-all"
        >
          Enregistrer les modifications
        </button>
      </form>

      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Zone de danger</p>
        <button
          type="button"
          onClick={onDelete}
          disabled={readOnly}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-100 bg-red-50/50 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <Trash2 size={16} />
          Supprimer le convive
        </button>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-white shadow-md ring-2 ring-white/20">
      <PlusIconLucide size={16} strokeWidth={3} />
    </span>
  );
}

function CitationDisplay() {
  const [showAuthor, setShowAuthor] = useState(false);
  const [citation, setCitation] = useState<{ phrase: string; author: string } | null>(null);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * citationsData.citations.length);
    setCitation(citationsData.citations[randomIndex]);
  }, []);

  if (!citation) return <div className="h-4" />; // Éviter le saut de mise en page pendant le chargement

  return (
    <button
      onClick={() => setShowAuthor(!showAuthor)}
      className="text-xs font-bold uppercase tracking-widest text-accent opacity-60 hover:opacity-100 transition-opacity cursor-pointer text-left"
      title={showAuthor ? "Cliquer pour cacher l'auteur" : "Cliquer pour voir l'auteur"}
    >
      {showAuthor ? (
        <span className="italic normal-case tracking-normal">{citation.author}</span>
      ) : (
        <span>{citation.phrase}</span>
      )}
    </button>
  );
}
