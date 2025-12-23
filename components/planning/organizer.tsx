"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import {
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { PlanData, Item } from "@/lib/types";
import { TabBar } from "../tab-bar";
import { BottomSheet } from "../ui/bottom-sheet";
import { Check, ShieldAlert, Share, ChevronDown } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useThemeMode } from "../theme-provider";
import { getPersonEmoji } from "@/lib/utils";
import { validateWriteKeyAction, getChangeLogsAction } from "@/app/actions";

// Extracted Components
import { SuccessToast } from "../common/success-toast";
import { ShareModal } from "../modals/share-modal";
import { ItemForm } from "../forms/item-form";
import { MealForm } from "../forms/meal-form";
import { PersonForm } from "../forms/person-form";
import { PersonEditForm } from "../forms/person-edit-form";
import { PlanningTab } from "./planning-tab";
import { PeopleTab } from "./people-tab";
import { SettingsTab } from "./settings-tab";

// Custom Hooks
import { useEventState } from "@/hooks/use-event-state";
import { useEventHandlers } from "@/hooks/use-event-handlers";

import { DayForm } from "../forms/day-form";
import { MealEditForm } from "../forms/meal-edit-form";

export function Organizer({
  initialPlan,
  slug,
  writeKey,
  writeEnabled: initialWriteEnabled,
}: {
  initialPlan: PlanData;
  slug: string;
  writeKey?: string;
  writeEnabled: boolean;
}) {
  const {
    plan,
    setPlan,
    tab,
    setTab,
    logs,
    setLogs,
    planningFilter,
    setPlanningFilter,
    sheet,
    setSheet,
    selectedPerson,
    setSelectedPerson,
    readOnly,
    setReadOnly,
    startTransition,
    activeItemId,
    setActiveItemId,
    successMessage,
    setSuccessMessage,
    logsLoading,
    setLogsLoading,
    unassignedItemsCount,
  } = useEventState(initialPlan, initialWriteEnabled);

  const handlers = useEventHandlers({
    plan,
    setPlan,
    slug,
    writeKey,
    readOnly,
    setSheet,
    setSelectedPerson,
    setSuccessMessage,
  });

  const {
    handleCreateItem,
    handleUpdateItem,
    handleAssign,
    handleDelete,
    handleMoveItem,
    handleCreateDay,
    handleCreateMeal,
    handleUpdateDay,
    handleDeleteDay,
    handleUpdateMealTitle,
    handleDeleteMeal,
    handleCreatePerson,
    handleUpdatePerson,
    handleDeletePerson,
    handleDeleteEvent,
    findItem,
  } = handlers;

  const { christmas, toggle: toggleChristmas } = useThemeMode();
  const searchParams = useSearchParams();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setSheet({ type: "share" });
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ea580c", "#ef4444", "#fbbf24", "#ffffff"],
      });
    }
  }, [searchParams, setSheet]);

  useEffect(() => {
    validateWriteKeyAction({ key: writeKey, slug }).then((ok) => setReadOnly(!ok));
  }, [writeKey, slug, setReadOnly]);

  useEffect(() => {
    if (tab === "settings") {
      setLogsLoading(true);
      getChangeLogsAction({ slug })
        .then(setLogs)
        .finally(() => setLogsLoading(false));
    }
  }, [tab, slug, setLogs, setLogsLoading]);

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

      <SuccessToast message={successMessage} christmas={christmas} />

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
            {!readOnly && (
              <button
                onClick={() => setSheet({ type: "share" })}
                className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent hover:bg-accent/20 transition-colors"
                title="Partager l'accès"
              >
                <Share size={12} /> Partager
              </button>
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
                  planningFilter.type === "all" ? "bg-accent text-white shadow-md ring-2 ring-accent/20" : "bg-white text-gray-400 hover:text-gray-600"
                )}
              >
                Tout le monde
              </button>
              <button
                onClick={() => setPlanningFilter({ type: "unassigned" })}
                className={clsx(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all",
                  planningFilter.type === "unassigned" ? "bg-amber-400 text-amber-950 shadow-md ring-2 ring-amber-400/20" : "bg-white text-gray-400 hover:text-amber-600"
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
                      planningFilter.type === "person" ? "bg-accent text-white shadow-md ring-2 ring-accent/20" : "bg-white text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {planningFilter.type === "person" ? (
                      <>
                        {getPersonEmoji(plan.people.find((p: any) => p.id === planningFilter.personId)?.name || "", plan.people.map((p: any) => p.name), plan.people.find((p: any) => p.id === planningFilter.personId)?.emoji)}{" "}
                        {plan.people.find((p: any) => p.id === planningFilter.personId)?.name}
                      </>
                    ) : ("Par personne")}
                    <ChevronDown size={14} className={clsx("transition-transform", sheet?.type === "person-select" && "rotate-180")} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 space-y-4 px-4 py-8">
        {tab === "planning" && (
          <PlanningTab
            plan={plan}
            planningFilter={planningFilter}
            activeItemId={activeItemId}
            readOnly={readOnly}
            sensors={sensors}
            onDragStart={(e: DragStartEvent) => setActiveItemId(Number(e.active.id))}
            onDragEnd={(e: DragEndEvent) => {
              setActiveItemId(null);
              const { active, over } = e;
              if (!over || !active.id) return;
              const itemId = Number(active.id);
              const found = findItem(itemId);
              if (!found) return;

              if (typeof over.id === "string" && over.id.startsWith("meal-")) {
                handleMoveItem(itemId, Number(over.id.replace("meal-", "")));
              } else if (typeof over.id === "number") {
                const targetItem = findItem(over.id);
                if (targetItem && targetItem.meal.id !== found.meal.id) {
                  const targetIndex = targetItem.meal.items.findIndex((i: any) => i.id === over.id);
                  handleMoveItem(itemId, targetItem.meal.id, targetIndex);
                }
              }
            }}
            onAssign={(item: Item, mealId: number) => setSheet({ type: "item", mealId, item })}
            onDelete={handleDelete}
            onCreateItem={(mealId: number) => setSheet({ type: "item", mealId })}
            onCreateMeal={() => setSheet({ type: "meal", dayId: plan.days[0]?.id })}
            setSheet={setSheet}
          />
        )}

        {tab === "people" && (
          <PeopleTab
            plan={plan}
            selectedPerson={selectedPerson}
            setSelectedPerson={setSelectedPerson}
            setSheet={setSheet}
            readOnly={readOnly}
          />
        )}

        {tab === "settings" && (
          <SettingsTab
            logsLoading={logsLoading}
            logs={logs}
            christmas={christmas}
            toggleChristmas={() => { }} // Will be handled by theme provider
            onDeleteEvent={handleDeleteEvent}
            readOnly={readOnly}
          />
        )}
      </main>

      <TabBar active={tab} onChange={setTab} />

      <BottomSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        title={
          sheet?.type === "item" ? (sheet.item ? "Modifier l'article" : "Ajouter un article") :
            sheet?.type === "meal" ? "Ajouter un repas" :
              sheet?.type === "meal-edit" ? "Modifier le repas" :
                sheet?.type === "day-edit" ? "Modifier le jour" :
                  sheet?.type === "person" ? "Ajouter un convive" :
                    sheet?.type === "person-edit" ? "Modifier le convive" :
                      sheet?.type === "person-select" ? "Filtrer par personne" :
                        sheet?.type === "share" ? "Partager l'accès" : ""
        }
      >
        {sheet?.type === "item" && (
          <ItemForm
            people={plan.people}
            defaultItem={sheet.item}
            allMeals={plan.days.flatMap((d: any) => d.meals.map((m: any) => ({ ...m, dayTitle: d.title || d.date })))}
            currentMealId={sheet.mealId || sheet.item?.mealId}
            onSubmit={(vals) =>
              sheet.item ? handleUpdateItem(sheet.item.id, vals) : handleCreateItem({ ...vals, mealId: sheet.mealId })
            }
            onAssign={(pId) => sheet.item && handleAssign(sheet.item, pId)}
            onMoveMeal={(mId) => sheet.item && handleMoveItem(sheet.item.id, mId)}
            onDelete={sheet.item ? () => handleDelete(sheet.item!) : undefined}
            readOnly={readOnly}
          />
        )}

        {sheet?.type === "meal" && (
          <MealForm
            days={plan.days}
            defaultDayId={sheet.dayId}
            forceNewDay={sheet.dayId === -1}
            readOnly={readOnly}
            onSubmit={async (dayId, title, newDayDate, newDayTitle) => {
              let targetDayId = dayId;
              if (dayId === -1 && newDayDate) {
                targetDayId = await handleCreateDay(newDayDate, newDayTitle);
              }
              handleCreateMeal(targetDayId, title);
            }}
          />
        )}
        {sheet?.type === "meal-edit" && (
          <MealEditForm
            meal={sheet.meal}
            onSubmit={handleUpdateMealTitle}
            onDelete={handleDeleteMeal}
            onClose={() => setSheet(null)}
          />
        )}
        {sheet?.type === "day-edit" && (
          <DayForm
            day={sheet.day}
            onSubmit={(date: string, title?: string) => handleUpdateDay(sheet.day.id, date, title)}
            onDelete={handleDeleteDay}
            onClose={() => setSheet(null)}
          />
        )}

        {sheet?.type === "person" && (
          <PersonForm
            readOnly={readOnly}
            onSubmit={handleCreatePerson}
          />
        )}

        {sheet?.type === "person-edit" && (
          <PersonEditForm
            person={sheet.person}
            allPeople={plan.people}
            readOnly={readOnly}
            onSubmit={(name, emoji) => handleUpdatePerson(sheet.person.id, name, emoji)}
            onDelete={() => handleDeletePerson(sheet.person.id)}
          />
        )}

        {sheet?.type === "person-select" && (
          <div className="space-y-2 p-1 max-h-96 overflow-y-auto no-scrollbar">
            <button
              onClick={() => { setPlanningFilter({ type: "all" }); setSheet(null); }}
              className={clsx("flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-sm font-bold transition-all", planningFilter.type === "all" ? "bg-accent/10 text-accent ring-1 ring-accent/20" : "text-gray-600 hover:bg-gray-50")}
            >
              <span>Tout le monde</span>
              {planningFilter.type === "all" && <Check size={16} className="ml-auto" />}
            </button>
            {plan.people.map((person: any) => (
              <button
                key={person.id}
                onClick={() => { setPlanningFilter({ type: "person", personId: person.id }); setSheet(null); }}
                className={clsx("flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-sm font-bold transition-all", planningFilter.type === "person" && planningFilter.personId === person.id ? "bg-accent/10 text-accent ring-1 ring-accent/20" : "text-gray-600 hover:bg-gray-50")}
              >
                <span className="text-xl">{getPersonEmoji(person.name, plan.people.map((p: any) => p.name), person.emoji)}</span>
                <span className="truncate">{person.name}</span>
                {planningFilter.type === "person" && planningFilter.personId === person.id && <Check size={16} className="ml-auto" />}
              </button>
            ))}
          </div>
        )}

        {sheet?.type === "share" && (
          <ShareModal
            slug={slug}
            adminKey={writeKey}
            onClose={() => setSheet(null)}
            isNew={searchParams.get("new") === "true"}
          />
        )}
      </BottomSheet>
    </div>
  );
}
