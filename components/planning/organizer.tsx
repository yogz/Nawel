"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  assignItemAction,
  createItemAction,
  createMealAction,
  createPersonAction,
  deleteItemAction,
  reorderItemsAction,
  updateItemAction,
  validateWriteKeyAction,
} from "@/app/actions";
import { PlanData, Item, Meal, Person } from "@/lib/types";
import { TabBar } from "../tab-bar";
import { MealSection } from "./meal-section";
import { BottomSheet } from "../ui/bottom-sheet";
import { Check, ShieldAlert, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useThemeMode } from "../theme-provider";

const tabOrder = ["planning", "unassigned", "people", "settings"] as const;
type SheetState =
  | { type: "item"; mealId: number; item?: Item }
  | { type: "meal"; dayId: number }
  | { type: "person" };

export function Organizer({ initialPlan, slug, writeKey, writeEnabled }: { initialPlan: PlanData; slug: string; writeKey?: string; writeEnabled: boolean }) {
  const [plan, setPlan] = useState(initialPlan);
  const [tab, setTab] = useState<(typeof tabOrder)[number]>("planning");
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<number | null>(initialPlan.people[0]?.id ?? null);
  const [readOnly, setReadOnly] = useState(!writeEnabled);
  const [pending, startTransition] = useTransition();
  const { christmas, toggle } = useThemeMode();

  useEffect(() => {
    validateWriteKeyAction({ key: writeKey }).then((ok) => setReadOnly(!ok));
  }, [writeKey, writeEnabled]);

  const setMealItems = (mealId: number, updater: (items: Item[]) => Item[]) => {
    setPlan((prev) => ({
      ...prev,
      days: prev.days.map((day) => ({
        ...day,
        meals: day.meals.map((meal) => (meal.id === mealId ? { ...meal, items: updater(meal.items) } : meal)),
      })),
    }));
  };

  const handleCreateItem = (data: { mealId: number; name: string; quantity?: string; note?: string }) => {
    if (readOnly) return;
    startTransition(async () => {
      const created = await createItemAction({ ...data, slug, key: writeKey });
      setMealItems(data.mealId, (items) => [...items, { ...created, person: null }]);
      setSheet(null);
    });
  };

  const handleUpdateItem = (item: Item) => {
    if (readOnly) return;
    startTransition(async () => {
      await updateItemAction({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        note: item.note,
        personId: item.personId ?? null,
        slug,
        key: writeKey,
      });
      setMealItems(item.mealId, (items) => items.map((it) => (it.id === item.id ? item : it)));
      setSheet(null);
    });
  };

  const handleAssign = (item: Item, personId: number | null) => {
    if (readOnly) return;
    startTransition(async () => {
      await assignItemAction({ id: item.id, personId, slug, key: writeKey });
      setMealItems(item.mealId, (items) =>
        items.map((it) => (it.id === item.id ? { ...it, personId } : it))
      );
    });
  };

  const handleDelete = (item: Item) => {
    if (readOnly) return;
    startTransition(async () => {
      await deleteItemAction({ id: item.id, slug, key: writeKey });
      setMealItems(item.mealId, (items) => items.filter((i) => i.id !== item.id));
    });
  };

  const handleReorder = (meal: Meal, orderedIds: number[]) => {
    if (readOnly) return;
    startTransition(async () => {
      setMealItems(meal.id, (current) => {
        const byId = new Map(current.map((i) => [i.id, i]));
        return orderedIds.map((id) => byId.get(id)!).filter(Boolean);
      });
      await reorderItemsAction({ mealId: meal.id, itemIds: orderedIds, slug, key: writeKey });
    });
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

  const handleCreatePerson = (name: string) => {
    if (readOnly) return;
    startTransition(async () => {
      const created = await createPersonAction({ name, slug, key: writeKey });
      setPlan((prev) => ({ ...prev, people: [...prev.people, created] }));
      setSelectedPerson(created.id);
      setSheet(null);
    });
  };

  const unassignedItems = useMemo(() => {
    const list: Array<{ item: Item; meal: Meal; dayTitle: string }> = [];
    plan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        meal.items.forEach((item) => {
          if (!item.personId) list.push({ item, meal, dayTitle: day.title || day.date });
        });
      });
    });
    return list;
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

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col pb-24">
      <div className="relative">
        {christmas && (
          <div className="garland h-3 w-full rounded-b-3xl">
            <div className="absolute -bottom-6 left-0 right-0 flex justify-around px-4 pointer-events-none opacity-50">
              <span>❄️</span>
              <span>⛄</span>
              <span>✨</span>
              <span>🦌</span>
              <span>❄️</span>
            </div>
          </div>
        )}
        {!readOnly ? (
          <div className="flex items-center gap-2 bg-green-100 px-4 py-3 text-sm text-green-800">
            <Check size={16} />
            Mode édition activé ✨
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-amber-100 px-4 py-3 text-sm text-amber-800">
            <ShieldAlert size={16} />
            Mode lecture (ajoute ?key=... pour éditer) 🔒
          </div>
        )}
      </div>
      <main className="flex-1 space-y-4 px-4 py-4">
        {tab === "planning" && (
          <div className="space-y-8">
            {plan.days.map((day) => (
              <div key={day.id} className="space-y-4">
                <h2 className="px-2 text-xl font-bold text-accent flex items-center gap-2">
                  <span>📅</span> {day.title || day.date}
                </h2>
                <div className="space-y-6">
                  {day.meals.map((meal) => (
                    <MealSection
                      key={meal.id}
                      meal={meal}
                      people={plan.people}
                      readOnly={readOnly}
                      onAssign={(item) => setSheet({ type: "item", mealId: meal.id, item })}
                      onDelete={handleDelete}
                      onReorder={(order) => handleReorder(meal, order)}
                      onCreate={() => setSheet({ type: "item", mealId: meal.id })}
                    />
                  ))}
                  {!readOnly && (
                    <button
                      onClick={() => setSheet({ type: "meal", dayId: day.id })}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white/50 px-4 py-4 text-sm font-semibold text-gray-600"
                    >
                      <PlusIcon />
                      Ajouter un repas
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "unassigned" && (
          <div className="space-y-3">
            {unassignedItems.length === 0 && <p className="text-sm text-gray-500">Tout est déjà prévu ! 🎉</p>}
            {unassignedItems.map(({ item, meal, dayTitle }) => (
              <div key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{dayTitle} • {meal.title}</p>
                    <p className="text-base font-semibold">{item.name}</p>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => setSheet({ type: "item", mealId: meal.id, item })}
                      className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white"
                    >
                      Choisir
                    </button>
                  )}
                </div>
                {item.note && <p className="mt-2 text-sm text-gray-600">{item.note}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === "people" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {plan.people.map((person) => (
                <button
                  key={person.id}
                  onClick={() => setSelectedPerson(person.id)}
                  className={clsx(
                    "rounded-full px-4 py-2 text-sm font-semibold shadow-sm",
                    selectedPerson === person.id
                      ? "bg-accent text-white"
                      : "bg-white text-gray-700 ring-1 ring-gray-200"
                  )}
                >
                  {person.name}
                </button>
              ))}
              {!readOnly && (
                <button
                  onClick={() => setSheet({ type: "person" })}
                  className="rounded-full border-2 border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
                >
                  + Add person
                </button>
              )}
            </div>
            {itemsForPerson.length === 0 ? (
              <p className="text-sm text-gray-500">Rien de prévu pour l&apos;instant.</p>
            ) : (
              <div className="space-y-2">
                {itemsForPerson.map(({ item, meal, dayTitle }) => (
                  <div key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">{dayTitle} • {meal.title}</p>
                    <p className="text-base font-semibold">{item.name}</p>
                    {(item.quantity || item.note) && (
                      <p className="text-sm text-gray-600">{[item.quantity, item.note].filter(Boolean).join(" • ")}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Christmas theme</p>
                <p className="text-sm text-gray-500">Subtle festive accents</p>
              </div>
              <button
                onClick={toggle}
                className={clsx(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm",
                  christmas ? "bg-accent text-white" : "bg-gray-100 text-gray-700"
                )}
              >
                <Sparkles size={16} /> {christmas ? "On" : "Off"}
              </button>
            </div>
            <div className="rounded-xl bg-accent-soft p-3 text-sm text-accent">
              Share this link with family. Keep the key only for editors.
              <div className="mt-2 break-all text-xs text-gray-600">
                {typeof window !== "undefined" ? window.location.href : "Add ?key=..."}
              </div>
            </div>
            {!readOnly ? (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
                <Check size={16} />
                Edit mode enabled via key.
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                <ShieldAlert size={16} />
                Add the ?key=... query to edit.
              </div>
            )}
          </div>
        )}
      </main>
      <TabBar active={tab} onChange={(t) => setTab(t)} />

      <BottomSheet
        open={sheet?.type === "item"}
        onClose={() => setSheet(null)}
        title={sheet?.type === "item" && sheet.item ? "Edit item" : "Add item"}
      >
        {sheet?.type === "item" && (
          <ItemForm
            people={plan.people}
            defaultItem={sheet.item}
            onSubmit={(values) => {
              if (sheet.type !== "item") return;
              sheet.item
                ? handleUpdateItem({ ...sheet.item, ...values })
                : handleCreateItem({ ...values, mealId: sheet.mealId });
            }}
            onAssign={(personId) => {
              if (sheet.type === "item" && sheet.item) {
                handleAssign(sheet.item, personId);
              }
            }}
            readOnly={readOnly}
          />
        )}
      </BottomSheet>

      <BottomSheet open={sheet?.type === "meal"} onClose={() => setSheet(null)} title="Add meal">
        {sheet?.type === "meal" && <MealForm onSubmit={(title) => handleCreateMeal(sheet.dayId, title)} readOnly={readOnly} />}
      </BottomSheet>

      <BottomSheet open={sheet?.type === "person"} onClose={() => setSheet(null)} title="Add person">
        {sheet?.type === "person" && <PersonForm onSubmit={(name) => handleCreatePerson(name)} readOnly={readOnly} />}
      </BottomSheet>
    </div>
  );
}

function ItemForm({
  people,
  defaultItem,
  onSubmit,
  onAssign,
  readOnly,
}: {
  people: Person[];
  defaultItem?: Item;
  onSubmit: (values: { name: string; quantity?: string; note?: string }) => void;
  onAssign: (personId: number | null) => void;
  readOnly?: boolean;
}) {
  const [name, setName] = useState(defaultItem?.name ?? "");
  const [quantity, setQuantity] = useState(defaultItem?.quantity ?? "");
  const [note, setNote] = useState(defaultItem?.note ?? "");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, quantity, note });
      }}
    >
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Item</span>
        <input
          className="w-full rounded-xl border border-gray-200 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cheese board"
          required
          disabled={readOnly}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Quantity</span>
          <input
            className="w-full rounded-xl border border-gray-200 px-3 py-2"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 2 trays"
            disabled={readOnly}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Note</span>
          <input
            className="w-full rounded-xl border border-gray-200 px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Gluten-free"
            disabled={readOnly}
          />
        </label>
      </div>
      {defaultItem && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-600">Assign to</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAssign(null)}
              disabled={readOnly}
              className="rounded-full bg-gray-100 px-3 py-1 text-sm"
            >
              Unassigned
            </button>
            {people.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => onAssign(person.id)}
                disabled={readOnly}
                className={clsx(
                  "rounded-full px-3 py-1 text-sm",
                  person.id === defaultItem.personId ? "bg-accent text-white" : "bg-gray-100"
                )}
              >
                {person.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        type="submit"
        disabled={readOnly}
        className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm active:scale-95 disabled:opacity-50"
      >
        {defaultItem ? "Update item" : "Add item"}
      </button>
    </form>
  );
}

function MealForm({ onSubmit, readOnly }: { onSubmit: (title: string) => void; readOnly?: boolean }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(title);
      }}
    >
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Meal title</span>
        <input
          className="w-full rounded-xl border border-gray-200 px-3 py-2"
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
        Save meal
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
        <span className="text-sm font-semibold">Name</span>
        <input
          className="w-full rounded-xl border border-gray-200 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add relative"
          required
          disabled={readOnly}
        />
      </label>
      <button
        type="submit"
        disabled={readOnly}
        className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm active:scale-95 disabled:opacity-50"
      >
        Add person
      </button>
    </form>
  );
}

function PlusIcon() {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-white shadow-sm">
      +
    </span>
  );
}
